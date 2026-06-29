# Website Sales — Lead Lists

Cold-call lead lists of small businesses that are strong prospects to be **sold a new website / landing page**.

## What makes a lead here

The highest-conversion prospect for selling websites is a business that is:

- **Active on Instagram and/or Facebook** (recent 2025–2026 posts/reviews — it's a real, functioning business), but
- has **no real website**, or only a weak placeholder (Linktree-only, Facebook-only, one-page Wix, "coming soon"), and
- has a **published, callable phone number**, and
- is **currently open** (corroborated by a recent review or post).

A business that already has a polished website is a *low* priority — there's little to sell.

## How "verified" is meant here

Each lead's phone number, Instagram, and Facebook were **corroborated from public sources** (Google/Yelp listings + the business's own social profiles) via web research, with source links in the `sources` column. This is a strong signal the business is real and currently operating.

It is **not** a guarantee the line is answered — only dialing confirms that. Always treat the `phone` as "published & current to our research," and verify by calling. Numbers flagged `confidence=low` need an extra look before you dial.

## Files

- `batch-YYYY-MM-DD-*.csv` — a dated batch of leads.
- `contacted-ledger.csv` — the master de-dupe ledger. **Add every business you contact here** (name + city + phone). Future batches are checked against this file so you never get a repeat.

## CSV columns

`name, city, niche, phone, instagram, facebook, website_status, open_signal, confidence, status, sources, notes`

- `website_status`: `none` | `social-only` | `linktree-only` | `weak/one-page` | `has-site` — prioritize the first four.
- `status`: your pipeline stage — `new` | `called` | `voicemail` | `interested` | `sold` | `dead`. Starts as `new`.

## Workflow

1. Work a batch top-to-bottom (highest confidence + weakest website first — those convert best).
2. When you contact one, set `status` and copy the row into `contacted-ledger.csv`.
3. For the next batch, leads are generated excluding everything already in the ledger.
