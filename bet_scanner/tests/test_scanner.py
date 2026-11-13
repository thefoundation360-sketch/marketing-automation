"""Offline tests (no network). Run from the bet_scanner folder:

    python -m unittest discover -s tests -v
"""

import sys
import unittest
from datetime import timezone
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import odds_api  # noqa: E402
import polymarket  # noqa: E402
import scanner  # noqa: E402
from odds_math import (  # noqa: E402
    american_to_prob,
    devig,
    fair_probs_from_books,
    kelly_fraction_binary,
    stake_dollars,
)

CFG = {
    "bankroll": 105,
    "edge_threshold": 0.04,
    "price_cushion": 0.01,
    "kelly_fraction": 0.25,
    "max_bet_pct": 0.03,
    "max_bet_dollars": 5,
    "min_price": 0.10,
    "max_price": 0.75,
}

# Shaped like a real The Odds API /odds response item.
RAW_GAME = {
    "id": "abc123",
    "sport_key": "basketball_nba",
    "commence_time": "2026-11-14T01:00:00Z",
    "home_team": "Minnesota Timberwolves",
    "away_team": "Dallas Mavericks",
    "bookmakers": [
        {"key": "draftkings", "markets": [{"key": "h2h", "outcomes": [
            {"name": "Dallas Mavericks", "price": 150},
            {"name": "Minnesota Timberwolves", "price": -178}]}]},
        {"key": "fanduel", "markets": [{"key": "h2h", "outcomes": [
            {"name": "Dallas Mavericks", "price": 145},
            {"name": "Minnesota Timberwolves", "price": -170}]}]},
    ],
}


def poly_event(dal_ask="0.35", dal_bid="0.34", start="2026-11-14 01:00:00+00", question=None):
    """Shaped like a Polymarket Gamma /events item (list fields are JSON strings)."""
    return {
        "slug": "nba-dal-min-2026-11-13",
        "title": "Mavericks vs. Timberwolves",
        "markets": [
            {
                "id": "555",
                "question": question or "Mavericks vs. Timberwolves",
                "outcomes": '["Mavericks", "Timberwolves"]',
                "outcomePrices": '["0.345", "0.655"]',
                "bestAsk": dal_ask,
                "bestBid": dal_bid,
                "gameStartTime": start,
                "active": True,
                "closed": False,
            },
            {
                "id": "556",
                "question": "Spread: Timberwolves (-4.5)",
                "outcomes": '["Timberwolves", "Mavericks"]',
                "outcomePrices": '["0.5", "0.5"]',
                "gameStartTime": start,
                "active": True,
                "closed": False,
            },
        ],
    }


class OddsMathTests(unittest.TestCase):
    def test_american_to_prob(self):
        self.assertAlmostEqual(american_to_prob(-400), 0.8)
        self.assertAlmostEqual(american_to_prob(300), 0.25)
        self.assertAlmostEqual(american_to_prob(-110), 0.5238, places=4)

    def test_devig_sums_to_one(self):
        fair = devig([american_to_prob(-110), american_to_prob(-110)])
        self.assertAlmostEqual(fair[0], 0.5)
        self.assertAlmostEqual(sum(fair), 1.0)

    def test_consensus_uses_sharp_books_when_present(self):
        lines = {
            "draftkings": {"A": -200, "B": 170},
            "pinnacle": {"A": -150, "B": 140},
        }
        fair, n = fair_probs_from_books(lines, ["pinnacle"])
        self.assertEqual(n, 1)
        self.assertAlmostEqual(fair["A"], devig([0.6, 100 / 240])[0])

    def test_kelly(self):
        # 41% fair vs 35% price -> (0.41-0.35)/0.65
        self.assertAlmostEqual(kelly_fraction_binary(0.41, 0.35), 0.06 / 0.65)
        self.assertEqual(kelly_fraction_binary(0.30, 0.35), 0.0)

    def test_stake_is_capped_and_rounded(self):
        # Quarter Kelly on $105 = ~$2.42 -> rounds down to $2.00
        self.assertEqual(stake_dollars(0.41, 0.35, 105), 2.0)
        # Huge edge still capped at 3% of bankroll ($3.15 -> $3.00)
        self.assertEqual(stake_dollars(0.90, 0.30, 105), 3.0)
        self.assertEqual(stake_dollars(0.30, 0.35, 105), 0.0)


class ParsingTests(unittest.TestCase):
    def test_parse_odds_game(self):
        g = odds_api.parse_game(RAW_GAME)
        self.assertEqual(g["commence_time"].tzinfo, timezone.utc)
        self.assertEqual(len(g["book_lines"]), 2)

    def test_polymarket_keeps_only_moneyline(self):
        markets = polymarket.parse_event(poly_event())
        self.assertEqual(len(markets), 1)
        m = markets[0]
        self.assertEqual(m["outcomes"], ["Mavericks", "Timberwolves"])
        # Buy Mavs at the ask (0.35); buy Wolves at 1 - bid (0.66)
        self.assertEqual(m["buy_prices"], [0.35, 0.66])
        self.assertIsNotNone(m["start_time"])

    def test_team_names_containing_under_are_not_filtered(self):
        # "Thunder" contains "under"; it must not be mistaken for an over/under market.
        ev = poly_event(question="Thunder vs. Trail Blazers")
        ev["markets"][0]["outcomes"] = '["Thunder", "Trail Blazers"]'
        self.assertEqual(len(polymarket.parse_event(ev)), 1)


class OverUnderFilterTests(unittest.TestCase):
    def test_over_under_outcomes_skipped(self):
        ev = poly_event(question="Chiefs season wins")
        ev["markets"][0]["outcomes"] = '["O 11.5", "U 11.5"]'
        self.assertEqual(polymarket.parse_event(ev), [])


class MatchingTests(unittest.TestCase):
    def test_team_matches(self):
        self.assertTrue(scanner.team_matches("Mavericks", "Dallas Mavericks"))
        self.assertTrue(scanner.team_matches("Trail Blazers", "Portland Trail Blazers"))
        self.assertTrue(scanner.team_matches("76ers", "Philadelphia 76ers"))
        self.assertFalse(scanner.team_matches("Mavericks", "Minnesota Timberwolves"))

    def test_finds_edge_on_underpriced_dog(self):
        games = [odds_api.parse_game(RAW_GAME)]
        markets = polymarket.parse_event(poly_event(dal_ask="0.33", dal_bid="0.32"))
        opps = scanner.find_opportunities(CFG, games, markets, "basketball_nba")
        self.assertEqual(len(opps), 1)
        o = opps[0]
        self.assertEqual(o["pick"], "Dallas Mavericks")
        self.assertEqual(o["poly_price"], 0.33)
        self.assertGreaterEqual(o["edge"], 0.04)
        self.assertGreaterEqual(o["stake"], 1.0)
        self.assertLessEqual(o["stake"], 5.0)
        title, body = scanner.format_alert(o, ZoneInfo("America/Chicago"))
        self.assertIn("Dallas Mavericks", title)
        self.assertIn("Limit", body)

    def test_no_edge_when_fairly_priced(self):
        games = [odds_api.parse_game(RAW_GAME)]
        markets = polymarket.parse_event(poly_event(dal_ask="0.39", dal_bid="0.38"))
        self.assertEqual(scanner.find_opportunities(CFG, games, markets, "basketball_nba"), [])

    def test_different_date_same_teams_not_matched(self):
        games = [odds_api.parse_game(RAW_GAME)]
        markets = polymarket.parse_event(poly_event(dal_ask="0.20", dal_bid="0.19",
                                                    start="2026-12-20 01:00:00+00"))
        self.assertEqual(scanner.find_opportunities(CFG, games, markets, "basketball_nba"), [])


if __name__ == "__main__":
    unittest.main()


class EnvConfigTests(unittest.TestCase):
    def test_config_from_env(self):
        import os
        from unittest import mock
        env = {"ODDS_API_KEY": "k", "NTFY_TOPIC": "bets-x", "AIRTABLE_TOKEN": "pat1",
               "AIRTABLE_BASE_ID": "appX", "BANKROLL": "250"}
        with mock.patch.dict(os.environ, env, clear=False):
            cfg = scanner.config_from_env()
        self.assertEqual(cfg["odds_api_key"], "k")
        self.assertEqual(cfg["alerts"]["ntfy_topic"], "bets-x")
        self.assertEqual(cfg["airtable"], {"token": "pat1", "base_id": "appX", "table_name": "Bets"})
        self.assertEqual(cfg["bankroll"], 250.0)
        self.assertEqual(cfg["edge_threshold"], 0.04)  # defaults kept

    def test_no_env_key_means_no_env_config(self):
        import os
        from unittest import mock
        with mock.patch.dict(os.environ, {"ODDS_API_KEY": ""}, clear=False):
            self.assertIsNone(scanner.config_from_env())
