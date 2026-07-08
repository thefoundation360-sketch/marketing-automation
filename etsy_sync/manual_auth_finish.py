#!/usr/bin/env python3
"""Step 2 of manual OAuth. Takes the full URL your browser landed on after
clicking Allow (even if that page failed to load) and completes the token
exchange server-side.

Usage:
    python manual_auth_finish.py "http://localhost:3003/oauth/callback?code=...&state=..."
"""

import json
import sys
import time
import urllib.parse
from pathlib import Path

import requests

from etsy_client import TOKEN_URL, load_config, save_tokens

HERE = Path(__file__).parent
STATE_PATH = HERE / ".auth_state.json"


def run(redirect_url: str):
    if not STATE_PATH.exists():
        raise SystemExit("No pending auth found. Run manual_auth_start.py first.")

    saved = json.loads(STATE_PATH.read_text())
    parsed = urllib.parse.urlparse(redirect_url)
    qs = urllib.parse.parse_qs(parsed.query)

    if "error" in qs:
        raise SystemExit(f"Etsy returned an error: {qs['error'][0]}")

    code = qs.get("code", [None])[0]
    returned_state = qs.get("state", [None])[0]
    if not code:
        raise SystemExit("No 'code' parameter found in that URL. Paste the full redirected URL.")
    if returned_state != saved["state"]:
        raise SystemExit("State mismatch -- this doesn't look like the URL from the auth flow you just started.")

    config = load_config()
    resp = requests.post(
        TOKEN_URL,
        data={
            "grant_type": "authorization_code",
            "client_id": config["keystring"],
            "redirect_uri": saved["redirect_uri"],
            "code": code,
            "code_verifier": saved["verifier"],
        },
        timeout=30,
    )
    if resp.status_code != 200:
        raise SystemExit(f"Token exchange failed ({resp.status_code}): {resp.text}")

    data = resp.json()
    save_tokens(
        {
            "access_token": data["access_token"],
            "refresh_token": data["refresh_token"],
            "obtained_at": int(time.time()),
            "expires_in": data.get("expires_in", 3600),
        }
    )
    STATE_PATH.unlink(missing_ok=True)
    print("Authorization complete. Tokens saved.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python manual_auth_finish.py "<redirected URL>"')
    run(sys.argv[1])
