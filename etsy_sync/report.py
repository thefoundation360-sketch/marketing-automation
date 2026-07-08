#!/usr/bin/env python3
"""Turn synced Etsy data into a "where to focus" money report.

Reads data/etsy_data.db (populated by sync.py) and produces, for a given
week: revenue/sales rolled up per niche, top and bottom listings by revenue,
week-over-week trend deltas, and simple pricing-opportunity flags. This is
pure analysis over already-synced numbers -- it makes no Etsy API calls.

Usage:
    python report.py                  # most recent synced week
    python report.py --week-start 2026-06-29
    python report.py --trend-weeks 6  # widen the trend window
"""

import argparse
import json
import sqlite3
from datetime import date, timedelta
from pathlib import Path

HERE = Path(__file__).parent
DATA_DIR = HERE / "data"
DB_PATH = DATA_DIR / "etsy_data.db"


def connect():
    if not DB_PATH.exists():
        raise SystemExit(
            f"No {DB_PATH} found. Run `python sync.py` at least once before generating a report."
        )
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def latest_week_start(conn):
    row = conn.execute(
        "SELECT week_start FROM weekly_sales ORDER BY week_start DESC LIMIT 1"
    ).fetchone()
    if not row:
        raise SystemExit("No synced weeks found in the database yet.")
    return row["week_start"]


def week_rows(conn, week_start: str):
    return conn.execute(
        """SELECT l.listing_id, l.title, l.niche, l.price, l.status,
                  l.review_count, l.avg_rating,
                  w.sales_count, w.revenue, w.views, w.clicks
           FROM listings l
           JOIN weekly_sales w ON w.listing_id = l.listing_id
           WHERE w.week_start = ?""",
        (week_start,),
    ).fetchall()


def niche_rollup(rows):
    by_niche = {}
    for r in rows:
        n = by_niche.setdefault(
            r["niche"], {"niche": r["niche"], "revenue": 0.0, "sales_count": 0, "listing_count": 0}
        )
        n["revenue"] += r["revenue"]
        n["sales_count"] += r["sales_count"]
        n["listing_count"] += 1
    for n in by_niche.values():
        n["revenue"] = round(n["revenue"], 2)
        n["avg_revenue_per_listing"] = round(n["revenue"] / n["listing_count"], 2)
    return sorted(by_niche.values(), key=lambda n: n["revenue"], reverse=True)


def pricing_flags(rows):
    """Flag simple, explainable pricing opportunities -- no ML, just heuristics."""
    priced = [r for r in rows if r["price"] and r["price"] > 0]
    if not priced:
        return []
    avg_price = sum(r["price"] for r in priced) / len(priced)
    sales_values = sorted((r["sales_count"] for r in rows), reverse=True)
    top_quartile_cutoff = sales_values[max(0, len(sales_values) // 4 - 1)] if sales_values else 0

    flags = []
    for r in rows:
        if r["status"] != "active":
            continue
        if r["sales_count"] >= max(top_quartile_cutoff, 1) and r["price"] < avg_price:
            flags.append(
                {
                    "listing_id": r["listing_id"],
                    "title": r["title"],
                    "niche": r["niche"],
                    "flag": "underpriced",
                    "detail": (
                        f"Sold {r['sales_count']} this week at ${r['price']:.2f} "
                        f"(shop avg ${avg_price:.2f}) -- strong demand, consider a price test."
                    ),
                }
            )
        elif r["sales_count"] == 0 and r["price"] > avg_price:
            flags.append(
                {
                    "listing_id": r["listing_id"],
                    "title": r["title"],
                    "niche": r["niche"],
                    "flag": "stagnant_premium",
                    "detail": (
                        f"$0 sales this week at ${r['price']:.2f} "
                        f"(shop avg ${avg_price:.2f}) -- may be overpriced or under-visible."
                    ),
                }
            )
    return flags


def trend(conn, week_start: str, trend_weeks: int):
    """Revenue per niche for each of the last `trend_weeks` completed weeks, oldest first."""
    start = date.fromisoformat(week_start)
    weeks = [(start - timedelta(weeks=i)).isoformat() for i in range(trend_weeks)][::-1]
    series = {}
    for wk in weeks:
        rows = week_rows(conn, wk)
        for n in niche_rollup(rows):
            series.setdefault(n["niche"], {})[wk] = n["revenue"]
    return weeks, series


def build_report(week_start: str, trend_weeks: int):
    conn = connect()
    rows = week_rows(conn, week_start)
    if not rows:
        raise SystemExit(f"No synced data for week_start={week_start}. Check data/latest.json for available weeks.")

    niches = niche_rollup(rows)
    by_revenue = sorted(rows, key=lambda r: r["revenue"], reverse=True)
    top_listings = by_revenue[:10]
    bottom_active = [r for r in by_revenue if r["status"] == "active"][-10:]
    flags = pricing_flags(rows)
    weeks, trend_series = trend(conn, week_start, trend_weeks)

    total_revenue = round(sum(r["revenue"] for r in rows), 2)
    total_sales = sum(r["sales_count"] for r in rows)

    conn.close()

    return {
        "week_start": week_start,
        "total_revenue": total_revenue,
        "total_sales": total_sales,
        "niches": niches,
        "top_listings": [dict(r) for r in top_listings],
        "bottom_active_listings": [dict(r) for r in bottom_active],
        "pricing_flags": flags,
        "trend_weeks": weeks,
        "trend_by_niche": trend_series,
    }


def render_markdown(report: dict) -> str:
    lines = [
        f"# Etsy Weekly Report -- week of {report['week_start']}",
        "",
        f"**Total revenue:** ${report['total_revenue']:.2f}  ",
        f"**Total sales:** {report['total_sales']}",
        "",
        "## Revenue by niche",
        "",
        "| Niche | Revenue | Sales | Listings | Avg $/listing |",
        "|---|---:|---:|---:|---:|",
    ]
    for n in report["niches"]:
        lines.append(
            f"| {n['niche']} | ${n['revenue']:.2f} | {n['sales_count']} | "
            f"{n['listing_count']} | ${n['avg_revenue_per_listing']:.2f} |"
        )

    lines += ["", "## Top 10 listings by revenue", "", "| Listing | Niche | Revenue | Sales | Price |", "|---|---|---:|---:|---:|"]
    for r in report["top_listings"]:
        lines.append(
            f"| {r['title']} | {r['niche']} | ${r['revenue']:.2f} | {r['sales_count']} | ${r['price']:.2f} |"
        )

    lines += [
        "",
        "## Active listings with the least revenue (candidates to fix or retire)",
        "",
        "| Listing | Niche | Revenue | Sales | Price |",
        "|---|---|---:|---:|---:|",
    ]
    for r in report["bottom_active_listings"]:
        lines.append(
            f"| {r['title']} | {r['niche']} | ${r['revenue']:.2f} | {r['sales_count']} | ${r['price']:.2f} |"
        )

    lines += ["", "## Pricing opportunities", ""]
    if report["pricing_flags"]:
        for f in report["pricing_flags"]:
            lines.append(f"- **{f['flag']}** -- {f['title']} ({f['niche']}): {f['detail']}")
    else:
        lines.append("No flags this week.")

    lines += ["", f"## Revenue trend by niche (last {len(report['trend_weeks'])} weeks)", ""]
    header = "| Niche | " + " | ".join(report["trend_weeks"]) + " |"
    sep = "|---|" + "---:|" * len(report["trend_weeks"])
    lines.append(header)
    lines.append(sep)
    for niche_name, by_week in report["trend_by_niche"].items():
        cells = " | ".join(f"${by_week.get(wk, 0):.2f}" for wk in report["trend_weeks"])
        lines.append(f"| {niche_name} | {cells} |")

    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--week-start", help="ISO date (Monday) of the week to report on. Defaults to the most recently synced week.")
    parser.add_argument("--trend-weeks", type=int, default=6, help="How many weeks back to show in the trend table.")
    args = parser.parse_args()

    conn = connect()
    week_start = args.week_start or latest_week_start(conn)
    conn.close()

    report = build_report(week_start, args.trend_weeks)

    DATA_DIR.mkdir(exist_ok=True)
    json_path = DATA_DIR / f"report_{week_start}.json"
    md_path = DATA_DIR / f"report_{week_start}.md"
    json_path.write_text(json.dumps(report, indent=2))
    md_path.write_text(render_markdown(report))

    print(render_markdown(report))
    print(f"\nWrote {md_path} and {json_path}")


if __name__ == "__main__":
    main()
