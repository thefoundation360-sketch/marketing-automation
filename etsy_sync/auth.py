#!/usr/bin/env python3
"""One-time OAuth 2.0 PKCE authorization against Etsy Open API v3.

Run this once (and again only if you ever revoke access). It opens your
browser to Etsy's consent screen, catches the redirect on a local server,
exchanges the code for an access + refresh token, and saves them to
tokens.json for sync.py to use and refresh automatically going forward.

Usage:
    python auth.py
"""

import base64
import hashlib
import http.server
import json
import secrets
import threading
import urllib.parse
import webbrowser

import requests

from etsy_client import CONFIG_PATH, TOKENS_PATH, TOKEN_URL, load_config, save_tokens

AUTHORIZE_URL = "https://www.etsy.com/oauth/connect"


def make_pkce_pair():
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(64)).rstrip(b"=").decode("ascii")
    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode("ascii")).digest())
        .rstrip(b"=")
        .decode("ascii")
    )
    return verifier, challenge


class _CallbackResult:
    code = None
    state = None
    error = None


def _make_handler(expected_state, result: _CallbackResult):
    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            parsed = urllib.parse.urlparse(self.path)
            qs = urllib.parse.parse_qs(parsed.query)

            if "error" in qs:
                result.error = qs["error"][0]
                body = f"Authorization failed: {result.error}. You can close this tab."
            elif qs.get("state", [None])[0] != expected_state:
                result.error = "state_mismatch"
                body = "Authorization failed: state mismatch. You can close this tab."
            else:
                result.code = qs["code"][0]
                result.state = qs["state"][0]
                body = "Etsy authorization complete. You can close this tab and return to the terminal."

            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(body.encode("utf-8"))

        def log_message(self, *args):
            pass  # keep the terminal quiet

    return Handler


def run():
    config = load_config()
    verifier, challenge = make_pkce_pair()
    state = secrets.token_urlsafe(16)
    scopes = " ".join(config.get("scopes", ["listings_r", "transactions_r", "shops_r"]))

    redirect_uri = config["redirect_uri"]
    parsed_redirect = urllib.parse.urlparse(redirect_uri)
    port = parsed_redirect.port or 3003

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

    result = _CallbackResult()
    server = http.server.HTTPServer(("localhost", port), _make_handler(state, result))
    server_thread = threading.Thread(target=server.handle_request, daemon=True)
    server_thread.start()

    print("Opening your browser to authorize this app against your Etsy shop...")
    print(f"If it doesn't open automatically, visit:\n{auth_url}\n")
    webbrowser.open(auth_url)

    server_thread.join(timeout=300)
    if result.code is None:
        raise SystemExit(
            f"Authorization did not complete (error={result.error}). "
            f"Make sure {redirect_uri} is registered as a redirect URI on your Etsy app."
        )

    token_resp = requests.post(
        TOKEN_URL,
        data={
            "grant_type": "authorization_code",
            "client_id": config["keystring"],
            "redirect_uri": redirect_uri,
            "code": result.code,
            "code_verifier": verifier,
        },
        timeout=30,
    )
    if token_resp.status_code != 200:
        raise SystemExit(f"Token exchange failed ({token_resp.status_code}): {token_resp.text}")

    data = token_resp.json()
    import time

    save_tokens(
        {
            "access_token": data["access_token"],
            "refresh_token": data["refresh_token"],
            "obtained_at": int(time.time()),
            "expires_in": data.get("expires_in", 3600),
        }
    )
    print(f"Saved tokens to {TOKENS_PATH}. You're ready to run sync.py.")


if __name__ == "__main__":
    run()
