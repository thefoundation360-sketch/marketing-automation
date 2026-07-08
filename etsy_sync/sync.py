#!/usr/bin/env python3
"""Weekly sync of real Etsy shop data: listings, orders/revenue, and reviews.

Replaces placeholder data with real numbers pulled from the Etsy Open API v3.

Etsy's public API does NOT expose per-listing views/clicks -- that data only
lives in Shop Manager > Stats. This script leaves those fields null unless
you maintain manual_stats.json by hand (see manual_stats.example.json).

Usage:
    python sync.py                  # sync the most recently completed Mon-Sun week
    python sync.py --weeks-back 2   # sync an earlier week
    python sync.py --since-days 30  # sync a custom trailing window instead of a calendar week
"""

import argparse
import json
import sqlite3
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

from etsy_client import EtsyClient

HERE = Path(__file__).parent
DATA_DIR = HERE / "data"
DB_PATH = DATA_DIR / "etsy_data.db"
NICHE_MAP_PATH = HERE / "niche_mapping.json"
MANUAL_STATS_PATH = HERE / "manual_stats.json"

SCHEMA = """
CREATE TABLE IF NOT EXISTS listings (
    listing_id INTEGER PRIMARY KEY,
    title TEXT,
    niche TEXT,
    price REAL,
    currency TEXT,
    status TEXT,
    review_count INTEGER,
    avg_rating REAL,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS weekly_sales (
    listing_id INTEGER,
    week_start TEXT,
    week_end TEXT,
    sales_count INTEGER,
    revenue REAL,
    views INTEGER,
    clicks INTEGER,
    synced_at TEXT,
    PRIMARY KEY (listing_id, week_start)
);
"""


def money_to_float(money: dict) -> float:
    if not money:
        return 0.0
    return money.get("amount", 0) / money.get("divisor", 100)


def load_json(path: Path, default):
    if path.exists():
        return json.loads(path.read_text())
    return default


def week_bounds(weeks_back: int):
    """Most recently completed Mon 00:00 UTC - Sun 23:59:59 UTC, or `weeks_back` weeks earlier."""
    now = datetime.now(timezone.utc)
    this_monday = (now - timedelta(days=now.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    last_monday = this_monday - timedelta(weeks=1 + weeks_back)
    week_end = last_monday + timedelta(days=7) - timedelta(seconds=1)
    return last_monday, week_end


def fetch_listings(client: EtsyClient, shop_id, niche_map):
    listings = {}
    for item in client.list_all_listings(shop_id):
        listing_id = item["listing_id"]
        listings[listing_id] = {
            "listing_id": listing_id,
            "title": item.get("title"),
            "niche": niche_map.get(str(listing_id), "Uncategorized"),
            "price": money_to_float(item.get("price")),
            "currency": (item.get("price") or {}).get("currency_code"),
            "status": item.get("state"),
        }
    return listings


def fetch_reviews_by_listing(client: EtsyClient, shop_id):
    ratings = defaultdict(list)
    for review in client.list_reviews(shop_id):
        listing_id = review.get("listing_id")
        rating = review.get("rating")
        if listing_id is not None and rating is not None:
            ratings[listing_id].append(rating)
    return {
        listing_id: {"review_count": len(vals), "avg_rating": round(sum(vals) / len(vals), 2)}
        for listing_id, vals in ratings.items()
    }


def fetch_weekly_sales(client: EtsyClient, shop_id, week_start: datetime, week_end: datetime):
    sales = defaultdict(lambda: {"sales_count": 0, "revenue": 0.0, "title": None})
    min_created = int(week_start.timestamp())
    max_created = int(week_end.timestamp())

    for receipt in client.list_receipts(shop_id, min_created=min_created, max_created=max_created):
        transactions = receipt.get("transactions")
        if transactions is None:
            transactions = list(client.list_receipt_transactions(shop_id, receipt["receipt_id"]))

        for tx in transactions:
            listing_id = tx.get("listing_id")
            if listing_id is None:
                continue
            quantity = tx.get("quantity", 1)
            line_total = money_to_float(tx.get("price")) * quantity
            sales[listing_id]["sales_count"] += quantity
            sales[listing_id]["revenue"] += line_total
            sales[listing_id]["title"] = tx.get("title")

    return sales


def merge_manual_stats(week_start: datetime, listing_id: int):
    manual = load_json(MANUAL_STATS_PATH, {})
    key = f"week_of_{week_start.date().isoformat()}"
    entry = manual.get(key, {}).get(str(listing_id))
    if entry:
        return entry.get("views"), entry.get("clicks")
    return None, None


def sync(weeks_back: int = 0):
    DATA_DIR.mkdir(exist_ok=True)
    client = EtsyClient()
    shop_id = client.get_shop_id()
    niche_map = load_json(NICHE_MAP_PATH, {})

    week_start, week_end = week_bounds(weeks_back)
    print(f"Syncing shop {shop_id} for week {week_start.date()} - {week_end.date()}...")

    listings = fetch_listings(client, shop_id, niche_map)
    print(f"  Pulled {len(listings)} listings.")

    review_stats = fetch_reviews_by_listing(client, shop_id)
    for listing_id, listing in listings.items():
        stats = review_stats.get(listing_id, {"review_count": 0, "avg_rating": None})
        listing["review_count"] = stats["review_count"]
        listing["avg_rating"] = stats["avg_rating"]

    sales = fetch_weekly_sales(client, shop_id, week_start, week_end)
    print(f"  Found sales activity on {len(sales)} listings.")

    now_iso = datetime.now(timezone.utc).isoformat()
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA)

    rows_out = []
    for listing_id, listing in listings.items():
        conn.execute(
            """INSERT INTO listings
               (listing_id, title, niche, price, currency, status, review_count, avg_rating, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(listing_id) DO UPDATE SET
                 title=excluded.title, niche=excluded.niche, price=excluded.price,
                 currency=excluded.currency, status=excluded.status,
                 review_count=excluded.review_count, avg_rating=excluded.avg_rating,
                 updated_at=excluded.updated_at""",
            (
                listing_id,
                listing["title"],
                listing["niche"],
                listing["price"],
                listing["currency"],
                listing["status"],
                listing["review_count"],
                listing["avg_rating"],
                now_iso,
            ),
        )

        sale = sales.get(listing_id, {"sales_count": 0, "revenue": 0.0})
        views, clicks = merge_manual_stats(week_start, listing_id)

        conn.execute(
            """INSERT INTO weekly_sales
               (listing_id, week_start, week_end, sales_count, revenue, views, clicks, synced_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(listing_id, week_start) DO UPDATE SET
                 sales_count=excluded.sales_count, revenue=excluded.revenue,
                 views=excluded.views, clicks=excluded.clicks, synced_at=excluded.synced_at""",
            (
                listing_id,
                week_start.date().isoformat(),
                week_end.date().isoformat(),
                sale["sales_count"],
                round(sale["revenue"], 2),
                views,
                clicks,
                now_iso,
            ),
        )

        rows_out.append(
            {
                "listing_id": listing_id,
                "title": listing["title"],
                "niche": listing["niche"],
                "price": listing["price"],
                "currency": listing["currency"],
                "status": listing["status"],
                "review_count": listing["review_count"],
                "avg_rating": listing["avg_rating"],
                "week_start": week_start.date().isoformat(),
                "week_end": week_end.date().isoformat(),
                "sales_count": sale["sales_count"],
                "revenue": round(sale["revenue"], 2),
                "views": views,
                "clicks": clicks,
            }
        )

    conn.commit()
    conn.close()

    rows_out.sort(key=lambda r: r["revenue"], reverse=True)
    snapshot = {
        "synced_at": now_iso,
        "shop_id": shop_id,
        "week_start": week_start.date().isoformat(),
        "week_end": week_end.date().isoformat(),
        "listings": rows_out,
    }

    latest_path = DATA_DIR / "latest.json"
    latest_path.write_text(json.dumps(snapshot, indent=2))
    history_path = DATA_DIR / f"snapshot_{week_start.date().isoformat()}.json"
    history_path.write_text(json.dumps(snapshot, indent=2))

    total_revenue = sum(r["revenue"] for r in rows_out)
    total_sales = sum(r["sales_count"] for r in rows_out)
    print(f"  Total sales: {total_sales}, total revenue: {total_revenue:.2f}")
    print(f"  Wrote {latest_path} and {history_path}")
    print(f"  Wrote {DB_PATH}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--weeks-back",
        type=int,
        default=0,
        help="0 = most recently completed Mon-Sun week, 1 = the week before that, etc.",
    )
    args = parser.parse_args()
    sync(weeks_back=args.weeks_back)


if __name__ == "__main__":
    main()
