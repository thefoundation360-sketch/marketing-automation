#!/usr/bin/env python3
"""
CFPB Auto-Filer — Playwright browser automation
Opens consumerfinance.gov/complaint and pre-fills complaint fields.
YOU must review and submit — the script stops before final submission.
"""

import json
import sys
import time
from pathlib import Path
from datetime import datetime

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
except ImportError:
    print("Installing playwright...")
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "playwright", "-q"])
    subprocess.run([sys.executable, "-m", "playwright", "install", "chromium", "--with-deps", "-q"])
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

DATA_DIR = Path(__file__).parent.parent / "generated_letters"
CFPB_URL = "https://www.consumerfinance.gov/complaint/"

BUREAUS = [
    {"company": "TransUnion LLC",                   "state": "PA"},
    {"company": "Experian Information Solutions",   "state": "TX"},
    {"company": "Equifax Information Services LLC", "state": "GA"},
]


def load_session_data():
    files = sorted(DATA_DIR.glob("session_data_*.json"), reverse=True)
    if not files:
        print("No session data found. Run generate_letters.py first.")
        sys.exit(1)
    with open(files[0]) as f:
        data = json.load(f)
    print(f"Loaded session data from: {files[0].name}")
    return data


def build_narrative(profile, items, bureau_name):
    item_lines = "\n".join(
        f"  - {it['creditor']} (Acct #{it['acct']}): {it['basis']} — ${it['balance']} — Relief: {it['relief']}"
        for it in items
    )
    return (
        f"I am filing this complaint against {bureau_name} for reporting inaccurate, unverifiable, "
        f"and/or obsolete information on my consumer credit file and for failing to conduct a proper "
        f"reinvestigation as required by the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681 et seq.\n\n"
        f"I submitted formal written disputes via Certified Mail on {datetime.now().strftime('%B %d, %Y')} "
        f"disputing the following items:\n\n{item_lines}\n\n"
        f"The bureau has either: (1) failed to respond within the statutory 30-day window, "
        f"(2) conducted a rubber-stamp verification without independent investigation, or "
        f"(3) verified inaccurate information without basis.\n\n"
        f"I demand that the CFPB require {bureau_name} to: (1) conduct a proper reinvestigation, "
        f"(2) delete all unverifiable or inaccurate items, and (3) provide written confirmation "
        f"of all corrections made. Current FICO Score: approximately {profile['fico']}."
    )


def fill_cfpb_complaint(page, profile, items, bureau):
    print(f"\n  Opening CFPB complaint flow for {bureau['company']}...")
    page.goto(CFPB_URL, wait_until="networkidle", timeout=30000)
    time.sleep(2)

    # Step 1: Select product
    print("  → Selecting product: Credit reporting")
    try:
        credit_btn = page.locator("text=Credit reporting").first
        credit_btn.click(timeout=8000)
        time.sleep(1)
    except PWTimeout:
        print("    (Could not auto-click product — select 'Credit reporting' manually)")

    # Step 2: Select issue
    print("  → Selecting issue: Incorrect information on your report")
    try:
        issue_btn = page.locator("text=Incorrect information on your report").first
        issue_btn.click(timeout=8000)
        time.sleep(1)
    except PWTimeout:
        print("    (Could not auto-click issue — select manually)")

    # Step 3: Company name
    print(f"  → Entering company: {bureau['company']}")
    try:
        company_input = page.locator("input[name*='company'], input[placeholder*='company'], input[id*='company']").first
        company_input.fill(bureau["company"], timeout=8000)
        time.sleep(1.5)
        # Try to select from autocomplete
        autocomplete = page.locator(f"text={bureau['company']}").first
        autocomplete.click(timeout=5000)
    except PWTimeout:
        print(f"    (Enter company name '{bureau['company']}' manually)")

    # Step 4: Narrative
    print("  → Filling complaint narrative")
    narrative = build_narrative(profile, items, bureau["company"])
    try:
        textarea = page.locator("textarea").first
        textarea.fill(narrative, timeout=8000)
    except PWTimeout:
        print("    (Paste narrative manually — it has been printed below)")
        print("\n" + "="*60)
        print(narrative)
        print("="*60 + "\n")

    # Step 5: Consumer info
    print("  → Filling consumer information")
    field_map = {
        "input[name*='first'], input[id*='first']": profile["name"].split()[0],
        "input[name*='last'], input[id*='last']":   " ".join(profile["name"].split()[1:]),
        "input[name*='email'], input[type='email']": profile["email"],
        "input[name*='phone'], input[type='tel']":  profile["phone"],
        "input[name*='address'], input[id*='address']": profile["address"],
        "input[name*='city'], input[id*='city']":   profile["city"],
        "input[name*='zip'], input[id*='zip']":     profile["zip"],
    }
    for selector, value in field_map.items():
        try:
            el = page.locator(selector).first
            if el.is_visible(timeout=3000):
                el.fill(value)
        except Exception:
            pass

    print(f"\n  ⚠️  REVIEW BEFORE SUBMITTING for {bureau['company']}")
    print("     The form has been pre-filled. Please:")
    print("     1. Review all fields for accuracy")
    print("     2. Attach your dispute letter PDF as a supporting document")
    print("     3. Click Submit yourself\n")
    input(f"  Press Enter when you've submitted the {bureau['company']} complaint (or to skip)...")


def main():
    data = load_session_data()
    profile    = data["profile"]
    items      = data["items"]

    print("\n\033[1;32m╔══════════════════════════════════════════╗\033[0m")
    print("\033[1;32m║   CFPB AUTO-FILER — consumerfinance.gov  ║\033[0m")
    print("\033[1;32m╚══════════════════════════════════════════╝\033[0m")
    print("This tool opens the CFPB complaint portal and pre-fills your complaint.")
    print("YOU review and submit each one.\n")
    print(f"Will file complaints against {len(BUREAUS)} bureaus for: {profile['name']}")
    input("Press Enter to launch browser (or Ctrl+C to cancel)...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=400)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page    = context.new_page()

        for bureau in BUREAUS:
            try:
                fill_cfpb_complaint(page, profile, items, bureau)
            except Exception as e:
                print(f"  Error on {bureau['company']}: {e}")
                print(f"  Navigate to {CFPB_URL} manually and use the narrative above.")

        print("\n\033[1;32m✅ CFPB filing session complete.\033[0m")
        print("Check your email for confirmation numbers from CFPB.")
        input("\nPress Enter to close browser...")
        browser.close()


if __name__ == "__main__":
    main()
