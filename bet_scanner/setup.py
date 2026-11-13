#!/usr/bin/env python3
"""One-time setup wizard. Asks a few questions, writes config.json, tests everything.

    python setup.py

Press Enter to keep the value shown in [brackets] or to skip an optional step.
"""

import json
import secrets
import sys
import webbrowser
from pathlib import Path

import requests

HERE = Path(__file__).parent
EXAMPLE = HERE / "config.example.json"
CONFIG = HERE / "config.json"


def ask(prompt, default=""):
    shown = f" [{default}]" if default else ""
    value = input(f"{prompt}{shown}: ").strip()
    return value or default


def step(n, title):
    print(f"\n--- Step {n}: {title} ---")


def main():
    cfg = json.loads((CONFIG if CONFIG.exists() else EXAMPLE).read_text())
    print("Bet Scanner setup. This takes about 10 minutes and you only do it once.")

    # 1. Odds API (optional)
    step(1, "Sportsbook odds")
    print("By default the scanner uses ESPN's free odds (no signup).")
    print("Optional: a free key from the-odds-api.com averages many sportsbooks for sharper fair odds.")
    key = cfg.get("odds_api_key", "")
    key = ask("Paste an Odds API key, or press Enter to use free ESPN odds", "" if "PASTE" in key else key)
    cfg["odds_api_key"] = key

    # 2. Bankroll
    step(2, "Bankroll")
    cfg["bankroll"] = float(ask("Current betting balance in dollars", str(cfg.get("bankroll", 105))))

    # 3. Phone alerts via ntfy
    step(3, "Phone alerts (ntfy, free)")
    alerts = cfg.setdefault("alerts", {})
    topic = alerts.get("ntfy_topic") or f"bets-{secrets.token_hex(5)}"
    alerts["ntfy_topic"] = topic
    print("1) Install the free 'ntfy' app on your phone (App Store / Google Play).")
    print(f"2) Tap +, and subscribe to this topic exactly:  {topic}")
    input("Press Enter once you've subscribed...")
    try:
        requests.post(f"https://ntfy.sh/{topic}", data="Bet Scanner connected. Alerts will show up here.",
                      headers={"Title": "Test alert"}, timeout=15).raise_for_status()
        print("Sent a test alert. You should see it on your phone now.")
    except requests.RequestException as e:
        print(f"Couldn't send the test alert ({e}). Check your internet and try again later.")

    # 4. Airtable
    step(4, "Airtable bet log (optional, recommended)")
    at = cfg.setdefault("airtable", {"token": "", "base_id": "", "table_name": "Bets"})
    print("a) In Airtable, create an empty base named 'Betting'. Open it and copy the part of the")
    print("   web address that starts with 'app' (example: appAbC123xyz). That's the base ID.")
    print("b) Go to https://airtable.com/create/tokens and create a token with these 4 scopes:")
    print("   data.records:read, data.records:write, schema.bases:read, schema.bases:write")
    print("   and under Access, add your 'Betting' base. Copy the token (starts with 'pat').")
    if input("Open the token page now? (y/N): ").strip().lower() == "y":
        webbrowser.open("https://airtable.com/create/tokens")
    base_id = ask("Paste base ID (or Enter to skip Airtable)", at.get("base_id", ""))
    if base_id:
        token = ask("Paste token", at.get("token", ""))
        at.update({"base_id": base_id.split("/")[0], "token": token})

    CONFIG.write_text(json.dumps(cfg, indent=2))
    print(f"\nSaved {CONFIG.name}. (It stays on this laptop and is never uploaded.)")

    sys.path.insert(0, str(HERE))
    if at.get("base_id") and at.get("token"):
        import airtable_log
        try:
            client = airtable_log.client_from_config(cfg)
            print(client.ensure_table(cfg.get("timezone", "America/Chicago")))
        except airtable_log.AirtableError as e:
            print(f"Airtable problem: {e}\nFix it, then run: python airtable_log.py --setup")

    # 5. Test scan
    step(5, "Test scan (prints only, sends nothing)")
    import scanner
    scanner.scan(scanner.load_config(), dry_run=True)
    print("\nSetup done. Start the scanner with the start file, or: python scanner.py --every 180")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit("\nSetup cancelled.")
