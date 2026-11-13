"""Fetch sportsbook moneylines from The Odds API (https://the-odds-api.com).

Free plan: 500 credits/month. Each call below costs 1 credit per sport
(one region, one market), so scanning 3 sports = 3 credits.
"""

from datetime import datetime, timedelta, timezone

import requests

API_BASE = "https://api.the-odds-api.com/v4"

# Books whose lines are usually the sharpest; used instead of the full consensus when present.
SHARP_BOOKS = ["pinnacle", "lowvig", "betonlineag", "circasports"]


class OddsApiError(RuntimeError):
    pass


def fetch_games(api_key, sport_key, hours_ahead=24, session=None):
    """Return (games, credits_remaining) for upcoming games in the next `hours_ahead` hours.

    Each game: {"id", "sport_key", "commence_time" (datetime UTC), "home_team", "away_team",
                "book_lines": {book_key: {team_name: american_odds}}}
    """
    http = session or requests
    now = datetime.now(timezone.utc)
    params = {
        "apiKey": api_key,
        "regions": "us",
        "markets": "h2h",
        "oddsFormat": "american",
        "commenceTimeFrom": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "commenceTimeTo": (now + timedelta(hours=hours_ahead)).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    resp = http.get(f"{API_BASE}/sports/{sport_key}/odds", params=params, timeout=30)
    if resp.status_code == 401:
        raise OddsApiError("The Odds API rejected your key. Check odds_api_key in config.json.")
    if resp.status_code == 429:
        raise OddsApiError("Out of Odds API credits for this month (or rate limited).")
    if resp.status_code == 422:
        raise OddsApiError(f"Unknown sport key '{sport_key}' (or it is out of season).")
    resp.raise_for_status()

    remaining = resp.headers.get("x-requests-remaining")
    return [parse_game(g) for g in resp.json()], remaining


def parse_game(raw):
    book_lines = {}
    for book in raw.get("bookmakers", []):
        for market in book.get("markets", []):
            if market.get("key") != "h2h":
                continue
            outcomes = market.get("outcomes", [])
            # Skip 3-way markets (soccer draws): this scanner only handles two-sided games.
            if len(outcomes) != 2:
                continue
            book_lines[book["key"]] = {o["name"]: o["price"] for o in outcomes}
    return {
        "id": raw["id"],
        "sport_key": raw.get("sport_key"),
        "commence_time": parse_iso(raw["commence_time"]),
        "home_team": raw["home_team"],
        "away_team": raw["away_team"],
        "book_lines": book_lines,
    }


def parse_iso(value):
    value = value.strip().replace("Z", "+00:00")
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt
