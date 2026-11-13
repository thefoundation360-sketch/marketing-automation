#!/usr/bin/env python3
"""Health check: proves each data source works. Prints counts and samples, never picks.

    python diagnose.py

- Polymarket: no key needed. Shows how many game markets it parsed per sport, plus the raw
  shape of one market so parsing problems are easy to fix.
- ESPN: free sportsbook moneylines, no key. Shows games and how many matched Polymarket.
- Odds API: runs only if ODDS_API_KEY (env) or config.json has a key. Shows games and how many
  matched a Polymarket market.
"""

import json
import os
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent))

import espn_odds  # noqa: E402
import odds_api  # noqa: E402
import polymarket  # noqa: E402
import scanner  # noqa: E402

SPORTS = ["basketball_nba", "americanfootball_nfl", "icehockey_nhl"]


def raw_sample(tag):
    """First event + first market keys straight from Gamma, for debugging the schema."""
    resp = requests.get(f"{polymarket.GAMMA_BASE}/events",
                        params={"tag_slug": tag, "closed": "false", "active": "true", "limit": 5},
                        timeout=30)
    resp.raise_for_status()
    events = resp.json()
    if not events:
        return "  raw: 0 events returned for this tag"
    ev = events[0]
    m = (ev.get("markets") or [{}])[0]
    keep = ["question", "outcomes", "outcomePrices", "bestAsk", "bestBid",
            "gameStartTime", "sportsMarketType", "active", "closed"]
    shown = {k: m.get(k) for k in keep if k in m}
    return (f"  raw: {len(events)} events (first: {ev.get('title')!r}, {len(ev.get('markets') or [])} markets)\n"
            f"  raw first market: {json.dumps(shown)[:600]}")


def odds_key():
    if os.environ.get("ODDS_API_KEY"):
        return os.environ["ODDS_API_KEY"]
    cfg_path = scanner.CONFIG_PATH
    if cfg_path.exists():
        key = json.loads(cfg_path.read_text()).get("odds_api_key", "")
        if key and "PASTE" not in key:
            return key
    return None


def main():
    ok = True
    print("=== Polymarket (public data, no key) ===")
    poly = {}
    for sport in SPORTS:
        tag = polymarket.SPORT_TAGS[sport]
        try:
            markets = polymarket.fetch_markets(sport)
            poly[sport] = markets
            print(f"{sport}: parsed {len(markets)} game markets")
            for m in markets[:3]:
                when = m["start_time"].strftime("%b %d %H:%MZ") if m["start_time"] else "no time"
                print(f"  e.g. {m['outcomes'][0]} {m['buy_prices'][0]:.2f} / "
                      f"{m['outcomes'][1]} {m['buy_prices'][1]:.2f}  ({when})")
            print(raw_sample(tag))
        except requests.RequestException as e:
            ok = False
            print(f"{sport}: FAILED ({e})")

    print("\n=== ESPN odds (free, no key) ===")
    for sport in SPORTS:
        try:
            games, _ = espn_odds.fetch_games(sport, 48)
        except requests.RequestException as e:
            ok = False
            print(f"{sport}: FAILED ({e})")
            continue
        matched = sum(1 for g in games if scanner.match_market(g, poly.get(sport, []))[0])
        print(f"{sport}: {len(games)} upcoming games with moneylines in next 48h, "
              f"{matched} matched to Polymarket")
        for g in games[:2]:
            book, lines = next(iter(g["book_lines"].items()))
            print(f"  e.g. {g['away_team']} @ {g['home_team']}: {lines} ({book})")

    print("\n=== The Odds API (optional) ===")
    key = odds_key()
    if not key:
        print("No ODDS_API_KEY. Fine: the scanner uses ESPN's free odds instead.")
    else:
        for sport in SPORTS:
            try:
                games, remaining = odds_api.fetch_games(key, sport, 48)
            except (odds_api.OddsApiError, requests.RequestException) as e:
                ok = False
                print(f"{sport}: FAILED ({e})")
                continue
            matched = sum(1 for g in games if scanner.match_market(g, poly.get(sport, []))[0])
            print(f"{sport}: {len(games)} games in next 48h, {matched} matched to Polymarket. "
                  f"Credits left: {remaining}")

    print("\nRESULT:", "OK" if ok else "PROBLEMS FOUND (see above)")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
