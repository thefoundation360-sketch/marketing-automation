"""Offline tests for the ESPN free odds parser."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import espn_odds  # noqa: E402
import polymarket  # noqa: E402
import scanner  # noqa: E402
from test_scanner import CFG, poly_event  # noqa: E402


def board(odds, state="pre"):
    return {"events": [{
        "id": "401",
        "date": "2026-11-14T01:00Z",
        "competitions": [{
            "date": "2026-11-14T01:00Z",
            "status": {"type": {"state": state}},
            "competitors": [
                {"homeAway": "home", "team": {"displayName": "Minnesota Timberwolves"}},
                {"homeAway": "away", "team": {"displayName": "Dallas Mavericks"}},
            ],
            "odds": [odds],
        }],
    }]}


CLASSIC = {"provider": {"name": "DraftKings"},
           "homeTeamOdds": {"moneyLine": -178}, "awayTeamOdds": {"moneyLine": 150}}
NEWER = {"provider": {"name": "ESPN BET"},
         "moneyline": {"home": {"close": {"odds": "-178"}}, "away": {"close": {"odds": "+150"}}}}


class EspnTests(unittest.TestCase):
    def test_classic_format(self):
        g = espn_odds.parse_scoreboard(board(CLASSIC), "basketball_nba")[0]
        self.assertEqual(g["book_lines"], {"espn_draftkings": {
            "Minnesota Timberwolves": -178.0, "Dallas Mavericks": 150.0}})
        self.assertEqual(g["commence_time"].hour, 1)

    def test_newer_format(self):
        g = espn_odds.parse_scoreboard(board(NEWER), "basketball_nba")[0]
        self.assertEqual(g["book_lines"]["espn_espnbet"]["Dallas Mavericks"], 150.0)

    def test_started_games_and_missing_odds_skipped(self):
        self.assertEqual(espn_odds.parse_scoreboard(board(CLASSIC, state="in"), "basketball_nba"), [])
        self.assertEqual(espn_odds.parse_scoreboard(board({"provider": {"name": "x"}}), "basketball_nba"), [])

    def test_american_parsing(self):
        self.assertEqual(espn_odds._american("EVEN"), 100.0)
        self.assertEqual(espn_odds._american("+130"), 130.0)
        self.assertIsNone(espn_odds._american("0.5"))
        self.assertIsNone(espn_odds._american(None))

    def test_espn_games_flow_into_scanner(self):
        games = espn_odds.parse_scoreboard(board(CLASSIC), "basketball_nba")
        markets = polymarket.parse_event(poly_event(dal_ask="0.30", dal_bid="0.29"))
        opps = scanner.find_opportunities(CFG, games, markets, "basketball_nba")
        self.assertEqual([o["pick"] for o in opps], ["Dallas Mavericks"])


if __name__ == "__main__":
    unittest.main()
