"""Thin client around Etsy Open API v3 for shop listings, receipts, and reviews.

Handles OAuth2 access-token refresh and Etsy's rate limiting (HTTP 429).
"""

import json
import time
import urllib.parse
from pathlib import Path

import requests

API_BASE = "https://api.etsy.com/v3/application"
TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token"

HERE = Path(__file__).parent
CONFIG_PATH = HERE / "config.json"
TOKENS_PATH = HERE / "tokens.json"


class EtsyAuthError(RuntimeError):
    pass


def load_config():
    if not CONFIG_PATH.exists():
        raise EtsyAuthError(
            f"Missing {CONFIG_PATH}. Copy config.example.json to config.json and fill in your "
            "Etsy API keystring/shared secret (see README.md)."
        )
    return json.loads(CONFIG_PATH.read_text())


def load_tokens():
    if not TOKENS_PATH.exists():
        raise EtsyAuthError(
            f"Missing {TOKENS_PATH}. Run `python auth.py` once to authorize this app against "
            "your Etsy shop before syncing."
        )
    return json.loads(TOKENS_PATH.read_text())


def save_tokens(tokens: dict):
    TOKENS_PATH.write_text(json.dumps(tokens, indent=2))
    TOKENS_PATH.chmod(0o600)


class EtsyClient:
    def __init__(self):
        self.config = load_config()
        self.tokens = load_tokens()
        self.session = requests.Session()

    # -- auth -----------------------------------------------------------

    def _keystring(self):
        return self.config["keystring"]

    def _refresh_access_token(self):
        resp = requests.post(
            TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "client_id": self._keystring(),
                "refresh_token": self.tokens["refresh_token"],
            },
            timeout=30,
        )
        if resp.status_code != 200:
            raise EtsyAuthError(
                f"Token refresh failed ({resp.status_code}): {resp.text}\n"
                "Your refresh token may have expired or been revoked. Re-run `python auth.py`."
            )
        data = resp.json()
        # Etsy rotates the refresh token on every refresh -- always persist the new pair.
        self.tokens["access_token"] = data["access_token"]
        self.tokens["refresh_token"] = data["refresh_token"]
        self.tokens["obtained_at"] = int(time.time())
        self.tokens["expires_in"] = data.get("expires_in", 3600)
        save_tokens(self.tokens)

    def _ensure_fresh_token(self):
        obtained_at = self.tokens.get("obtained_at", 0)
        expires_in = self.tokens.get("expires_in", 3600)
        # Refresh a little early to avoid a request failing mid-flight.
        if time.time() >= obtained_at + expires_in - 60:
            self._refresh_access_token()

    def user_id(self):
        """Etsy access tokens are formatted '<numeric_user_id>.<opaque>'."""
        return self.tokens["access_token"].split(".")[0]

    # -- low-level request wrapper ---------------------------------------

    def _request(self, method, path, params=None, max_retries=5):
        self._ensure_fresh_token()
        url = f"{API_BASE}{path}"
        headers = {
            "x-api-key": self._keystring(),
            "Authorization": f"Bearer {self.tokens['access_token']}",
        }

        backoff = 1
        for attempt in range(max_retries):
            resp = self.session.request(method, url, headers=headers, params=params, timeout=30)

            if resp.status_code == 429:
                retry_after = int(resp.headers.get("Retry-After", backoff))
                time.sleep(retry_after)
                backoff = min(backoff * 2, 60)
                continue

            if resp.status_code == 401:
                # Token might have just been invalidated server-side; try one refresh+retry.
                self._refresh_access_token()
                headers["Authorization"] = f"Bearer {self.tokens['access_token']}"
                continue

            if resp.status_code >= 500:
                time.sleep(backoff)
                backoff = min(backoff * 2, 60)
                continue

            resp.raise_for_status()
            return resp.json()

        raise RuntimeError(f"Gave up on {method} {path} after {max_retries} retries")

    def _paginate(self, path, params=None, page_size=100):
        params = dict(params or {})
        params["limit"] = page_size
        offset = 0
        while True:
            params["offset"] = offset
            page = self._request("GET", path, params=params)
            results = page.get("results", [])
            for item in results:
                yield item
            offset += len(results)
            if offset >= page.get("count", 0) or not results:
                break

    # -- shop resolution ---------------------------------------------------

    def get_shop_id(self):
        configured = self.config.get("shop_id")
        if configured:
            return configured
        shops = self._request("GET", f"/users/{self.user_id()}/shops")
        # Etsy returns a single shop object (not a list) for this endpoint.
        shop_id = shops.get("shop_id")
        if not shop_id:
            raise EtsyAuthError(
                "Could not resolve shop_id automatically. Set it explicitly in config.json."
            )
        return shop_id

    # -- data pulls ----------------------------------------------------------

    def list_active_listings(self, shop_id):
        yield from self._paginate(f"/shops/{shop_id}/listings/active")

    def list_all_listings(self, shop_id):
        """Includes inactive/sold-out/expired listings so status changes are visible."""
        for state in ("active", "inactive", "sold_out", "expired", "draft"):
            yield from self._paginate(
                f"/shops/{shop_id}/listings", params={"state": state}
            )

    def list_receipts(self, shop_id, min_created=None, max_created=None):
        params = {}
        if min_created is not None:
            params["min_created"] = int(min_created)
        if max_created is not None:
            params["max_created"] = int(max_created)
        yield from self._paginate(f"/shops/{shop_id}/receipts", params=params)

    def list_receipt_transactions(self, shop_id, receipt_id):
        yield from self._paginate(f"/shops/{shop_id}/receipts/{receipt_id}/transactions")

    def list_reviews(self, shop_id):
        yield from self._paginate(f"/shops/{shop_id}/reviews")
