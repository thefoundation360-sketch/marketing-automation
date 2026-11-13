#!/usr/bin/env python3
"""Level 1 bet scanner: compares Polymarket prices to sportsbook consensus and alerts you.

It never places bets. When Polymarket is cheaper than the fair (no-vig) sportsbook
probability by at least `edge_threshold`, it sends you an alert with the team, the max
price to pay, and a suggested stake. You place the bet yourself.

Usage:
    python scanner.py              # scan once, send alerts
    python scanner.py --dry-run    # scan once, print only (no alerts, no state saved)
    python scanner.py --every 120  # keep running, scan every 120 minutes
"""

import argparse
import csv
import json
import re
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

import airtable_log
import alerts
import espn_odds
import odds_api
import polymarket
from odds_math import fair_probs_from_books, stake_dollars

HERE = Path(__file__).parent
CONFIG_PATH = HERE / "config.json"
DATA_DIR = HERE / "data"
STATE_PATH = DATA_DIR / "alerted.json"
LOG_PATH = DATA_DIR / "opportunities.csv"

LOG_FIELDS = [
    "found_at", "sport", "game", "start_local", "pick", "poly_price", "max_price",
    "fair_prob", "edge", "books_used", "suggested_stake",
    # You fill these in after the game:
    "placed_stake", "price_got", "result_win_loss", "profit",
]

SPORT_EMOJI = {"basketball": "🏀", "americanfootball": "🏈", "icehockey": "🏒", "baseball": "⚾"}

# Max gap between the sportsbook start time and Polymarket's start time to count as the same game.
MAX_START_GAP = timedelta(hours=18)


ENV_KEYS = {
    "ODDS_API_KEY": ("odds_api_key",),
    "BANKROLL": ("bankroll",),
    "NTFY_TOPIC": ("alerts", "ntfy_topic"),
    "MAKE_WEBHOOK_URL": ("alerts", "make_webhook_url"),
    "AIRTABLE_TOKEN": ("airtable", "token"),
    "AIRTABLE_BASE_ID": ("airtable", "base_id"),
}


def config_from_env():
    """Build config from environment variables (used by the GitHub Actions schedule).

    Starts from config.example.json defaults; only variables that are set override them.
    Returns None unless running in GitHub Actions or at least one variable is set.
    """
    import os
    if os.environ.get("GITHUB_ACTIONS") != "true" and not any(os.environ.get(k) for k in ENV_KEYS):
        return None
    cfg = json.loads((HERE / "config.example.json").read_text())
    cfg["odds_api_key"] = ""
    cfg.setdefault("airtable", {})
    for env, path in ENV_KEYS.items():
        value = os.environ.get(env, "").strip()
        if not value:
            continue
        target = cfg
        for part in path[:-1]:
            target = target.setdefault(part, {})
        target[path[-1]] = float(value) if env == "BANKROLL" else value
    return cfg


def load_config(require_odds_key=True):
    env_cfg = None if CONFIG_PATH.exists() else config_from_env()
    if env_cfg:
        return env_cfg
    if not CONFIG_PATH.exists():
        sys.exit(
            f"Missing {CONFIG_PATH.name}. Run `python setup.py` (or copy config.example.json to "
            "config.json) (see README.md)."
        )
    return json.loads(CONFIG_PATH.read_text())


def has_odds_key(cfg):
    key = cfg.get("odds_api_key") or ""
    return bool(key) and "PASTE" not in key


def fetch_book_games(cfg, sport):
    """Sportsbook lines: The Odds API if a key is set (many books), else ESPN (free, one book)."""
    hours = int(cfg.get("hours_ahead", 24))
    if has_odds_key(cfg):
        games, remaining = odds_api.fetch_games(cfg["odds_api_key"], sport, hours)
        return games, f"Odds API credits left: {remaining}"
    games, _ = espn_odds.fetch_games(sport, hours)
    return games, "odds source: ESPN (free)"


# ---------- team matching ----------

def _norm(name):
    return re.sub(r"[^a-z0-9 ]", "", name.lower()).strip()


def team_matches(poly_name, book_name):
    """'Mavericks' matches 'Dallas Mavericks'; 'Trail Blazers' matches 'Portland Trail Blazers'."""
    p, b = _norm(poly_name), _norm(book_name)
    if not p or not b:
        return False
    return p == b or b.endswith(" " + p) or p.endswith(" " + b)


def match_market(game, markets):
    """Find the Polymarket market for this sportsbook game.

    Returns (market, {book_team_name: polymarket_outcome_index}) or (None, None).
    """
    teams = [game["home_team"], game["away_team"]]
    for m in markets:
        if m["start_time"] and abs(m["start_time"] - game["commence_time"]) > MAX_START_GAP:
            continue
        mapping = {}
        for team in teams:
            hits = [i for i, o in enumerate(m["outcomes"]) if team_matches(o, team)]
            if len(hits) == 1:
                mapping[team] = hits[0]
        if len(mapping) == 2 and set(mapping.values()) == {0, 1}:
            return m, mapping
    return None, None


# ---------- core scan ----------

def find_opportunities(cfg, games, markets, sport_key):
    """Pure function: compare games vs markets and return a list of opportunity dicts."""
    opps = []
    cushion = float(cfg.get("price_cushion", 0.01))
    threshold = float(cfg.get("edge_threshold", 0.04))
    min_price = float(cfg.get("min_price", 0.10))
    max_price = float(cfg.get("max_price", 0.75))
    for game in games:
        fair, n_books = fair_probs_from_books(game["book_lines"], odds_api.SHARP_BOOKS)
        if n_books == 0 or len(fair) != 2:
            continue
        market, mapping = match_market(game, markets)
        if not market:
            continue
        for team, idx in mapping.items():
            if team not in fair:
                continue
            price = market["buy_prices"][idx]
            if not (min_price <= price <= max_price):
                continue
            # Edge after a small cushion for fees, slippage, and US-app price differences.
            edge = fair[team] - (price + cushion)
            if edge < threshold:
                continue
            stake = stake_dollars(
                fair[team], price + cushion, float(cfg["bankroll"]),
                kelly_mult=float(cfg.get("kelly_fraction", 0.25)),
                max_pct=float(cfg.get("max_bet_pct", 0.03)),
                max_dollars=float(cfg.get("max_bet_dollars", 5)),
            )
            if stake <= 0:
                continue
            opponent = game["away_team"] if team == game["home_team"] else game["home_team"]
            opps.append({
                "key": f"{market['id']}:{idx}",
                "sport": sport_key,
                "game": f"{game['away_team']} @ {game['home_team']}",
                "pick": team,
                "opponent": opponent,
                "start": game["commence_time"],
                "poly_price": price,
                # Highest price that still clears the edge threshold.
                "max_price": round(fair[team] - threshold - cushion, 3),
                "fair_prob": round(fair[team], 3),
                "edge": round(edge, 3),
                "books_used": n_books,
                "stake": stake,
                "slug": market["slug"],
            })
    return sorted(opps, key=lambda o: o["edge"], reverse=True)


def fmt_time(dt, tz):
    """'Thu 7:30 PM' (portable: Windows strftime has no %-I)."""
    local = dt.astimezone(tz)
    hour = local.strftime("%I").lstrip("0") or "12"
    return f"{local.strftime('%a')} {hour}:{local.strftime('%M %p')}"


def format_alert(opp, tz):
    start = fmt_time(opp["start"], tz)
    emoji = SPORT_EMOJI.get(opp["sport"].split("_")[0], "🎯")
    title = f"{emoji} BET: {opp['pick']} to win"
    body = (
        f"{opp['pick']} to beat {opp['opponent']} ({start})\n"
        f"Polymarket now: {opp['poly_price']:.0%}  |  Fair: {opp['fair_prob']:.0%}  |  Edge: {opp['edge']:.1%}\n"
        f"Buy only at {opp['max_price']:.1%} or lower (use a Limit order)\n"
        f"Stake: ${opp['stake']:.2f}\n"
        f"First: check injuries. Star out or questionable = SKIP."
    )
    return title, body


# ---------- state + log ----------

def load_state():
    if STATE_PATH.exists():
        return json.loads(STATE_PATH.read_text())
    return {}


def save_state(state):
    DATA_DIR.mkdir(exist_ok=True)
    # Forget alerts older than 3 days so the file stays small.
    cutoff = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
    state = {k: v for k, v in state.items() if v.get("at", "") >= cutoff}
    STATE_PATH.write_text(json.dumps(state, indent=2))


def should_alert(opp, state, improvement):
    prev = state.get(opp["key"])
    return prev is None or opp["poly_price"] <= prev["price"] - improvement


def append_log(opp, tz):
    DATA_DIR.mkdir(exist_ok=True)
    new_file = not LOG_PATH.exists()
    with LOG_PATH.open("a", newline="") as f:
        w = csv.DictWriter(f, fieldnames=LOG_FIELDS)
        if new_file:
            w.writeheader()
        w.writerow({
            "found_at": datetime.now(tz).strftime("%Y-%m-%d %H:%M"),
            "sport": opp["sport"],
            "game": opp["game"],
            "start_local": opp["start"].astimezone(tz).strftime("%Y-%m-%d %H:%M"),
            "pick": opp["pick"],
            "poly_price": opp["poly_price"],
            "max_price": opp["max_price"],
            "fair_prob": opp["fair_prob"],
            "edge": opp["edge"],
            "books_used": opp["books_used"],
            "suggested_stake": opp["stake"],
        })


def scan(cfg, dry_run=False, quiet=False):
    tz = ZoneInfo(cfg.get("timezone", "America/Chicago"))
    state = load_state()
    total_found = 0
    price_lookup = {}  # market_key -> current buy price, used to update open Airtable rows
    airtable = None
    if not dry_run:
        try:
            airtable = airtable_log.client_from_config(cfg)
        except airtable_log.AirtableError as e:
            print(f"Airtable disabled: {e}")
    print(f"\n=== Scan {fmt_time(datetime.now(timezone.utc), tz)} ===")
    for sport in cfg.get("sports", []):
        try:
            games, source_note = fetch_book_games(cfg, sport)
            markets = polymarket.fetch_markets(sport)
        except (odds_api.OddsApiError, requests.RequestException) as e:
            print(f"{sport}: skipped ({e})")
            continue

        for m in markets:
            for i, price in enumerate(m["buy_prices"]):
                price_lookup[f"{m['id']}:{i}"] = price
        opps = find_opportunities(cfg, games, markets, sport)
        print(f"{sport}: {len(games)} games, {len(markets)} Polymarket markets, "
              f"{len(opps)} edges. {source_note}")
        for opp in opps:
            total_found += 1
            title, body = format_alert(opp, tz)
            if not quiet:
                print(f"\n{title}\n{body}")
            if dry_run:
                continue
            if should_alert(opp, state, float(cfg.get("realert_improvement", 0.02))):
                sent = alerts.send_all(cfg.get("alerts"), title, body, {
                    **{k: v for k, v in opp.items() if k != "start"},
                    "start": opp["start"].isoformat(),
                    "message": body,
                })
                append_log(opp, tz)
                if airtable:
                    try:
                        airtable.create(airtable_log.opp_to_fields(opp, datetime.now(timezone.utc)))
                        sent.append("airtable")
                    except (airtable_log.AirtableError, requests.RequestException) as e:
                        print(f"  ! Airtable row failed: {e}")
                state[opp["key"]] = {"price": opp["poly_price"],
                                     "at": datetime.now(timezone.utc).isoformat()}
                print(f"  -> alert {total_found} sent via: {', '.join(sent) or 'nothing configured (printed only)'}")
            else:
                print(f"  -> alert {total_found}: already sent at this price, skipping")
    if not dry_run:
        save_state(state)
    if airtable:
        try:
            print(airtable_log.sync(airtable, price_lookup))
        except (airtable_log.AirtableError, requests.RequestException) as e:
            print(f"Airtable sync failed: {e}")
    if total_found == 0:
        print("\nNo edges right now. That's normal. Most scans find nothing.")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="print only; no alerts, no saved state")
    parser.add_argument("--every", type=int, metavar="MINUTES", help="repeat the scan every N minutes")
    parser.add_argument("--test-alert", action="store_true",
                        help="send one sample alert through every configured channel, then exit")
    parser.add_argument("--quiet", action="store_true",
                        help="don't print pick details (for public logs, e.g. GitHub Actions)")
    args = parser.parse_args()
    cfg = load_config()
    if args.test_alert:
        sent = alerts.send_all(cfg.get("alerts"), "✅ TEST: Bet Scanner alerts work",
                               "This is a test. Real alerts look like this, with the team, the max "
                               "price to pay, and the stake.\nNo action needed.", {"test": True})
        print(f"Test alert sent via: {', '.join(sent) or 'NOTHING (no alert channel configured)'}")
        sys.exit(0 if sent else 1)
    if not args.every:
        scan(cfg, args.dry_run, args.quiet)
        return
    if args.every < 30:
        sys.exit("Use --every 30 or more so you don't burn through free Odds API credits.")
    while True:
        scan(cfg, args.dry_run, args.quiet)
        print(f"\nNext scan in {args.every} minutes. Ctrl+C to stop.")
        time.sleep(args.every * 60)


if __name__ == "__main__":
    main()
