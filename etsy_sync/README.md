# Etsy Shop Sync

Pulls **real** data from your Etsy shop (listings, orders, revenue, reviews)
via the Etsy Open API v3 and stores it in a local SQLite database plus JSON
snapshots, replacing any placeholder/sample data.

## What this does and doesn't cover

Pulled automatically, per listing, per week:
- `listing_id`, `title`, `price`, `status` (active/inactive/sold_out/expired/draft)
- `sales_count`, `revenue` — computed from real receipts/transactions for the week
- `review_count`, `avg_rating` — computed from shop reviews

**Not available:** Etsy's public API does not expose per-listing views or
clicks — that only exists in Shop Manager > Stats inside Etsy's own
dashboard. `views`/`clicks` are left `null` unless you fill in
`manual_stats.json` by hand each week (see `manual_stats.example.json`).
This is optional and entirely manual — there is no API workaround.

`niche` (Funny Occupation, Grief & Memorial, Pet Memorial, Mental Health,
etc.) is your own categorization, not something Etsy tracks, so it comes
from `niche_mapping.json`, which you maintain.

## One-time setup

### 1. Register an Etsy app

1. Go to https://www.etsy.com/developers/register and create an app.
2. Note the **Keystring** (API key) and **Shared secret**.
3. Under the app's OAuth settings, add a redirect URI, e.g.
   `http://localhost:3003/oauth/callback` (must match `config.json` exactly).

### 2. Install dependencies

```bash
cd etsy_sync
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Configure credentials

```bash
cp config.example.json config.json
```

Edit `config.json` and fill in `keystring`, `shared_secret`, and
`redirect_uri` (matching what you registered). Leave `shop_id` as `null` —
it's resolved automatically from your account on first run.

### 4. Authorize access to your shop (OAuth 2.0 PKCE)

```bash
python auth.py
```

This opens your browser to Etsy's consent screen, you approve access, and
the script catches the redirect locally and saves `access_token` +
`refresh_token` to `tokens.json`. `sync.py` refreshes the access token
automatically from then on — you only run `auth.py` again if you ever
revoke access in your Etsy account settings.

### 5. Map your listings to niches (optional but recommended)

```bash
cp niche_mapping.example.json niche_mapping.json
```

Edit it with your real `listing_id -> niche` pairs. Anything not listed
comes through as `"Uncategorized"`.

### 6. (Optional) Manual views/clicks

```bash
cp manual_stats.example.json manual_stats.json
```

Copy views/clicks from Shop Manager > Stats into this file weekly if you
want them in the synced output. Otherwise skip this — those fields just
stay `null`.

## Running a sync

```bash
python sync.py                  # syncs the most recently completed Mon-Sun week
python sync.py --weeks-back 1   # syncs the week before that (e.g. to backfill)
```

Output:
- `data/etsy_data.db` — SQLite database with `listings` and `weekly_sales` tables (accumulates history across runs)
- `data/latest.json` — most recent snapshot, one row per listing
- `data/snapshot_<week-start>.json` — dated snapshot per week, for history

## Scheduling it weekly

Run `crontab -e` and add (adjust the path and Python interpreter):

```cron
# Every Monday at 6am, sync last week's Etsy data
0 6 * * 1 cd /path/to/marketing-automation/etsy_sync && .venv/bin/python sync.py >> sync.log 2>&1
```

## Error handling built in

- **Token expiration**: `sync.py` checks token age before every request batch
  and refreshes automatically using the stored refresh token (which Etsy
  rotates on every refresh — the new one is always saved back to
  `tokens.json`).
- **Rate limits**: requests that hit HTTP 429 back off using Etsy's
  `Retry-After` header (or exponential backoff if absent) and retry, up to
  5 attempts per request.
- **Transient 5xx errors**: retried with exponential backoff.
- If your refresh token itself is ever revoked/expired, `sync.py` will raise
  a clear error telling you to re-run `python auth.py`.

## Files

| File | Purpose | Commit to git? |
|---|---|---|
| `config.example.json` / `niche_mapping.example.json` / `manual_stats.example.json` | Templates | Yes |
| `config.json`, `tokens.json`, `niche_mapping.json`, `manual_stats.json` | Your real credentials/data | **No** (gitignored) |
| `data/` | Synced database + JSON snapshots (real revenue numbers) | **No** (gitignored) |
| `etsy_client.py` | API wrapper: auth, retries, pagination | Yes |
| `auth.py` | One-time OAuth PKCE setup | Yes |
| `sync.py` | Weekly sync entrypoint | Yes |
