"""Offline tests for the Airtable log (fake HTTP, no network)."""

import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import airtable_log  # noqa: E402
from airtable_log import (  # noqa: E402
    Airtable,
    plan_open_updates,
    plan_profit_updates,
    profit,
    resolution_from_market,
)

NOW = datetime(2026, 11, 14, 12, 0, tzinfo=timezone.utc)


class FakeResp:
    def __init__(self, status, data):
        self.status_code, self._data, self.text = status, data, str(data)

    def json(self):
        return self._data


class FakeSession:
    """Records requests and replies from a queue."""

    def __init__(self, replies):
        self.replies, self.calls = list(replies), []

    def request(self, method, url, **kw):
        self.calls.append((method, url, kw))
        return self.replies.pop(0)


def rec(rid, **fields):
    return {"id": rid, "fields": fields}


class ProfitTests(unittest.TestCase):
    def test_profit_math(self):
        self.assertEqual(profit(2, 0.35, "Win"), 3.71)   # $2 at 35% -> $5.71 back
        self.assertEqual(profit(2, 0.35, "Loss"), -2.0)
        self.assertEqual(profit(2, 0.35, "Void"), 0.0)
        self.assertIsNone(profit(None, 0.35, "Win"))
        self.assertIsNone(profit(2, 0.35, None))

    def test_resolution(self):
        self.assertEqual(resolution_from_market({"closed": True, "outcomePrices": '["1", "0"]'}, 0), "Win")
        self.assertEqual(resolution_from_market({"closed": True, "outcomePrices": '["1", "0"]'}, 1), "Loss")
        self.assertEqual(resolution_from_market({"closed": True, "outcomePrices": ["0.5", "0.5"]}, 0), "Void")
        self.assertIsNone(resolution_from_market({"closed": False, "outcomePrices": '["1", "0"]'}, 0))
        self.assertIsNone(resolution_from_market(None, 0))


class PlanTests(unittest.TestCase):
    def test_updates_latest_price_before_tipoff(self):
        start = (NOW + timedelta(hours=5)).isoformat()
        records = [rec("r1", **{"Market Key": "555:0", "Start": start, "Latest Price": 0.35})]
        ups = plan_open_updates(records, {"555:0": 0.31}, lambda mid: None, now=NOW)
        self.assertEqual(ups, [("r1", {"Latest Price": 0.31})])

    def test_settles_finished_game_with_paper_and_real_profit(self):
        start = (NOW - timedelta(hours=4)).isoformat()
        records = [
            rec("r1", **{"Market Key": "555:0", "Start": start, "Alert Price": 0.35,
                         "Suggested Stake": 2, "Stake Placed": 5, "Price Got": 0.34}),
            rec("r2", **{"Market Key": "777:1", "Start": start, "Alert Price": 0.40,
                         "Suggested Stake": 2}),
        ]
        markets = {"555": {"closed": True, "outcomePrices": '["1", "0"]'},
                   "777": {"closed": True, "outcomePrices": '["1", "0"]'}}
        ups = dict(plan_open_updates(records, {}, markets.get, now=NOW))
        self.assertEqual(ups["r1"]["Result"], "Win")
        self.assertEqual(ups["r1"]["Paper Profit"], 3.71)
        self.assertEqual(ups["r1"]["Profit"], 9.71)  # $5 at 34%
        self.assertEqual(ups["r2"], {"Result": "Loss", "Paper Profit": -2.0})

    def test_waits_until_game_is_likely_over(self):
        start = (NOW - timedelta(hours=1)).isoformat()
        records = [rec("r1", **{"Market Key": "555:0", "Start": start})]
        called = []
        self.assertEqual(plan_open_updates(records, {}, lambda m: called.append(m), now=NOW), [])
        self.assertEqual(called, [])

    def test_profit_filled_when_stake_entered_later(self):
        records = [rec("r1", **{"Result": "Loss", "Stake Placed": 3, "Alert Price": 0.4})]
        self.assertEqual(plan_profit_updates(records), [("r1", {"Profit": -3.0})])


class ClientTests(unittest.TestCase):
    def test_ensure_table_creates_when_missing(self):
        s = FakeSession([FakeResp(200, {"tables": []}), FakeResp(200, {"id": "tbl1"})])
        msg = Airtable("pat", "appX", session=s).ensure_table()
        self.assertIn("Created", msg)
        method, url, kw = s.calls[1]
        self.assertEqual(method, "POST")
        names = [f["name"] for f in kw["json"]["fields"]]
        self.assertEqual(names[0], "Pick")
        self.assertIn("Paper Profit", names)

    def test_ensure_table_adds_missing_fields_only(self):
        fields = [{"name": f["name"]} for f in airtable_log.table_fields("UTC") if f["name"] != "Profit"]
        s = FakeSession([FakeResp(200, {"tables": [{"id": "tbl1", "name": "Bets", "fields": fields}]}),
                         FakeResp(200, {})])
        msg = Airtable("pat", "appX", session=s).ensure_table()
        self.assertIn("Profit", msg)
        self.assertEqual(len(s.calls), 2)

    def test_update_many_batches_of_ten(self):
        s = FakeSession([FakeResp(200, {})] * 3)
        Airtable("pat", "appX", session=s).update_many([(f"r{i}", {"Result": "Win"}) for i in range(23)])
        self.assertEqual([len(c[2]["json"]["records"]) for c in s.calls], [10, 10, 3])

    def test_bad_token_message(self):
        s = FakeSession([FakeResp(401, {})])
        with self.assertRaises(airtable_log.AirtableError):
            Airtable("bad", "appX", session=s).ensure_table()


if __name__ == "__main__":
    unittest.main()
