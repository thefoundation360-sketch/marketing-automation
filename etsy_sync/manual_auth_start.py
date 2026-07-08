#!/usr/bin/env python3
"""Step 1 of manual OAuth (for environments where auth.py's local server can't
reach the user's browser). Generates the PKCE pair, saves state to
.auth_state.json, and prints the URL for the user to open themselves.
"""

import base64
import hashlib
import json
import secrets
import urllib.parse
from pathlib import Path

from etsy_client import CONFIG_PATH, load_config

AUTHORIZE_URL = "https://www.etsy.com/oauth/connect"
HERE = Path(__file__).parent
STATE_PATH = HERE / ".auth_state.json"


def make_pkce_pair():
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(64)).rstrip(b"=").decode("ascii")
    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode("ascii")).digest())
        .rstrip(b"=")
        .decode("ascii")
    )
    return verifier, challenge


def run():
    config = load_config()
    verifier, challenge = make_pkce_pair()
    state = secrets.token_urlsafe(16)
    scopes = " ".join(config.get("scopes", ["listings_r", "transactions_r", "shops_r"]))
    redirect_uri = config["redirect_uri"]

    params = {
        "response_type": "code",
        "client_id": config["keystring"],
        "redirect_uri": redirect_uri,
        "scope": scopes,
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    auth_url = f"{AUTHORIZE_URL}?{urllib.parse.urlencode(params)}"

    STATE_PATH.write_text(json.dumps({"verifier": verifier, "state": state, "redirect_uri": redirect_uri}))
    STATE_PATH.chmod(0o600)

    print(auth_url)


if __name__ == "__main__":
    run()
