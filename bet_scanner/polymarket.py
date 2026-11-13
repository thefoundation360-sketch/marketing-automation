"""Read Polymarket game (moneyline) markets from the public Gamma API. No account or key needed.

This only READS prices. It never places orders.

Note: Polymarket's US app and the international site share most sports markets, but
prices can differ by a cent or two. Always confirm the price in your app before buying.
"""

import json
import re
from datetime import datetime, timezone

import requests

GAMMA_BASE = "https://gamma-api.polymarket.com"

# The Odds API sport key -> Polymarket tag slug.
SPORT_TAGS = {
    "basketball_nba": "nba",
    "americanfootball_nfl": "nfl",
    "icehockey_nhl": "nhl",
    "basketball_ncaab": "ncaab",
    "americanfootball_ncaaf": "cfb",
    "baseball_mlb": "mlb",
}

# Words that mark a market as something other than "who wins the game".
NON_MONEYLINE = re.compile(
    r"spread|o/u|\bover\b|\bunder\b|\btotal\b|\bpoints\b|rebounds|assists|yards|receptions"
    r"|\b1st\b|first half|quarter|\bperiod\b",
    re.IGNORECASE,
)


def fetch_markets(sport_key, session=None, max_pages=5):
    """Return a list of two-outcome game markets for a sport.

    Each market: {"id", "question", "slug", "outcomes": [a, b], "buy_prices": [pa, pb],
                  "start_time": datetime or None}
    """
    tag = SPORT_TAGS.get(sport_key)
    if not tag:
        return []
    http = session or requests
    markets = []
    for page in range(max_pages):
        params = {
            "tag_slug": tag,
            "closed": "false",
            "active": "true",
            "limit": 100,
            "offset": page * 100,
        }
        resp = http.get(f"{GAMMA_BASE}/events", params=params, timeout=30)
        resp.raise_for_status()
        events = resp.json()
        if not events:
            break
        for event in events:
            markets.extend(parse_event(event))
        if len(events) < 100:
            break
    return markets


def _json_list(value):
    """Gamma returns some list fields as JSON-encoded strings."""
    if isinstance(value, list):
        return value
    if isinstance(value, str) and value.strip().startswith("["):
        try:
            return json.loads(value)
        except ValueError:
            return []
    return []


def _parse_time(value):
    if not value:
        return None
    text = str(value).strip().replace("Z", "+00:00").replace(" ", "T", 1)
    # "+00" -> "+00:00" (Gamma sometimes omits minutes on the offset)
    text = re.sub(r"([+-]\d{2})$", r"\1:00", text)
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _float(value):
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    return f if 0 < f < 1 else None


def parse_event(event):
    out = []
    for m in event.get("markets", []) or []:
        if m.get("closed") or m.get("active") is False:
            continue
        smt = (m.get("sportsMarketType") or "").lower()
        if smt and smt != "moneyline":
            continue
        question = m.get("question") or event.get("title") or ""
        if not smt and NON_MONEYLINE.search(question):
            continue
        outcomes = _json_list(m.get("outcomes"))
        if len(outcomes) != 2 or {o.lower() for o in outcomes} == {"yes", "no"}:
            continue
        # Over/under outcomes like "O 11.5" / "U 11.5" are not team names.
        if any(re.match(r"^[OU] \d", o.strip()) or re.search(r"\d+\.5", o) for o in outcomes):
            continue
        prices = [_float(p) for p in _json_list(m.get("outcomePrices"))]
        if len(prices) != 2:
            continue

        # Price you'd actually pay to BUY each side. bestAsk is for outcome 0;
        # buying outcome 1 costs about 1 - bestBid. Fall back to the displayed price.
        best_ask = _float(m.get("bestAsk"))
        best_bid = _float(m.get("bestBid"))
        buy_a = best_ask if best_ask is not None else prices[0]
        buy_b = (1 - best_bid) if best_bid is not None else prices[1]
        if buy_a is None or buy_b is None:
            continue

        out.append(
            {
                "id": str(m.get("id")),
                "question": question,
                "slug": event.get("slug") or m.get("slug") or "",
                "outcomes": outcomes,
                "buy_prices": [round(buy_a, 4), round(buy_b, 4)],
                "start_time": _parse_time(m.get("gameStartTime"))
                or _parse_time(event.get("startTime"))
                or _parse_time(event.get("startDate")),
            }
        )
    return out
