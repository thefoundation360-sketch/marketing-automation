"""Free sportsbook moneylines from ESPN's public scoreboard feed. No key, no signup.

ESPN shows one sportsbook's line per game (usually DraftKings or ESPN BET). That's less
precise than averaging many books with The Odds API, but it's free and has no limits, so it's
the default when no Odds API key is set.

Returns games in the same shape as odds_api.fetch_games, so the scanner treats them the same.
"""

from datetime import datetime, timedelta, timezone

import requests

BASE = "https://site.api.espn.com/apis/site/v2/sports"

LEAGUES = {
    "basketball_nba": "basketball/nba",
    "americanfootball_nfl": "football/nfl",
    "icehockey_nhl": "hockey/nhl",
    "basketball_ncaab": "basketball/mens-college-basketball",
    "americanfootball_ncaaf": "football/college-football",
    "baseball_mlb": "baseball/mlb",
}


def _american(value):
    """ESPN gives moneylines as ints (-150), strings ("-150", "+130"), or "EVEN"."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value) if value != 0 else None
    text = str(value).strip().upper()
    if text in ("EVEN", "EV", "PK"):
        return 100.0
    try:
        f = float(text.replace("+", ""))
    except ValueError:
        return None
    return f if abs(f) >= 100 else None


def _moneylines(odds):
    """Pull (home, away) American moneylines from an ESPN odds object, any known format."""
    home = _american((odds.get("homeTeamOdds") or {}).get("moneyLine"))
    away = _american((odds.get("awayTeamOdds") or {}).get("moneyLine"))
    if home is not None and away is not None:
        return home, away
    ml = odds.get("moneyline") or {}
    def pick(side):
        s = ml.get(side) or {}
        for when in ("close", "current", "open"):
            v = _american((s.get(when) or {}).get("odds"))
            if v is not None:
                return v
        return None
    home, away = pick("home"), pick("away")
    if home is not None and away is not None:
        return home, away
    return None


def _parse_time(value):
    text = str(value).replace("Z", "+00:00")
    # ESPN often omits seconds: "2026-11-14T01:00+00:00"
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def parse_scoreboard(data, sport_key):
    games = []
    for ev in data.get("events", []):
        comp = (ev.get("competitions") or [{}])[0]
        state = ((comp.get("status") or ev.get("status") or {}).get("type") or {}).get("state")
        if state and state != "pre":  # only games that haven't started
            continue
        teams = {c.get("homeAway"): (c.get("team") or {}).get("displayName") for c in comp.get("competitors", [])}
        home, away = teams.get("home"), teams.get("away")
        start = _parse_time(comp.get("date") or ev.get("date") or "")
        if not (home and away and start):
            continue
        book_lines = {}
        for odds in comp.get("odds") or []:
            mls = _moneylines(odds)
            if not mls:
                continue
            provider = ((odds.get("provider") or {}).get("name") or "espn").lower().replace(" ", "")
            book_lines[f"espn_{provider}"] = {home: mls[0], away: mls[1]}
        if book_lines:
            games.append({
                "id": str(ev.get("id")),
                "sport_key": sport_key,
                "commence_time": start,
                "home_team": home,
                "away_team": away,
                "book_lines": book_lines,
            })
    return games


def fetch_games(sport_key, hours_ahead=24, session=None):
    """Return (games, "free") for games starting within `hours_ahead` hours."""
    league = LEAGUES.get(sport_key)
    if not league:
        return [], "free"
    http = session or requests
    now = datetime.now(timezone.utc)
    end = now + timedelta(hours=hours_ahead)
    # ESPN's dates are US-local, so ask for yesterday through the end date to cover time zones.
    day, games, seen = (now - timedelta(days=1)).date(), [], set()
    while day <= end.date():
        params = {"dates": day.strftime("%Y%m%d"), "limit": 300}
        if sport_key in ("basketball_ncaab", "americanfootball_ncaaf"):
            params["groups"] = "50" if sport_key == "basketball_ncaab" else "80"  # all D-I teams
        resp = http.get(f"{BASE}/{league}/scoreboard", params=params, timeout=30)
        resp.raise_for_status()
        for g in parse_scoreboard(resp.json(), sport_key):
            if g["id"] not in seen and now <= g["commence_time"] <= end:
                seen.add(g["id"])
                games.append(g)
        day += timedelta(days=1)
    return games, "free"
