# Bet Scanner (Level 1: alerts only)

Finds games where **Polymarket is cheaper than the sportsbooks say it should be**, then
texts your phone with the team, the max price to pay, and how much to bet.

**It never places bets.** You get the alert, check injuries, and tap buy yourself.

```
🏀 BET: Dallas Mavericks to win
Dallas Mavericks to beat Minnesota Timberwolves (Fri 7:00 PM)
Polymarket now: 33%  |  Fair: 39%  |  Edge: 4.9%
Buy only at 33.9% or lower (use a Limit order)
Stake: $1.50
First: check injuries. Star out or questionable = SKIP.
```

## How it works
1. Pulls moneylines from US sportsbooks (The Odds API) and removes the books' cut to get a
   **fair win %** (the median across books, or sharp books like Pinnacle/LowVig when listed).
2. Pulls Polymarket's buy price for the same game (public data, no login).
3. If fair % minus (Polymarket price + 1% cushion for fees/slippage) is **4 points or more**,
   it alerts you. It skips heavy favorites over 75% and long shots under 10%.
4. Stake = quarter Kelly, capped at **3% of bankroll and $5**, rounded down to $0.50.
5. It logs every alert to `data/opportunities.csv` and won't re-alert the same bet unless
   the price drops another 2 points.

## Setup (about 15 minutes, one time)

**1. Get a free Odds API key.** Sign up at https://the-odds-api.com (free = 500 credits/month).

**2. Install Python** (Mac: already installed, or https://www.python.org/downloads/).
Then in Terminal:
```bash
cd marketing-automation/bet_scanner
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp config.example.json config.json   # Windows: copy config.example.json config.json
```

**3. Edit `config.json`:**
- `odds_api_key`: paste your key.
- `bankroll`: your current balance (update it weekly).
- Alerts (pick at least one):
  - **ntfy (easiest, free):** install the **ntfy** app on your phone, subscribe to a
    hard-to-guess topic like `mecca-bets-7k2q9x`, and put that same name in `ntfy_topic`.
    Anyone who knows the topic name can read it, so make it random.
  - **Make.com:** create a scenario with a **Custom webhook** trigger, paste its URL into
    `make_webhook_url`, then add modules to send an SMS or **add an Airtable row** (fields
    arrive as `pick`, `poly_price`, `max_price`, `fair_prob`, `edge`, `stake`, `start`, `message`).
  - **Email:** set `enabled: true` and use a Gmail **app password**
    (Google Account → Security → App passwords). Never use your real password.

**4. Test it:**
```bash
python scanner.py --dry-run
```
This prints what it finds without sending anything.

## Daily use
```bash
source .venv/bin/activate
python scanner.py               # one scan, sends alerts
python scanner.py --every 180   # scan every 3 hours while the laptop is open
```

**Credits:** each scan costs 1 credit per sport. With the default 3 sports, that's 3 per scan.
500 free credits ≈ 160 scans a month ≈ **5 a day**. `--every 180` during game days fits.
The scan prints how many credits are left.

**Run it automatically (Mac):** run `crontab -e` and add this line (scans at 11am, 3pm and 6pm):
```
0 11,15,18 * * * cd /FULL/PATH/TO/marketing-automation/bet_scanner && .venv/bin/python scanner.py >> data/cron.log 2>&1
```
(The laptop must be awake.) On Windows, use Task Scheduler to run the same command.

## When an alert comes in
1. Check injuries for both teams. Star out or questionable = skip.
2. Open Polymarket and use a **Limit** order at or below the "Buy only at" price.
3. Bet the stake shown. Not more.
4. After the game, fill in `placed_stake`, `price_got`, `result_win_loss`, and `profit` in
   `data/opportunities.csv` (it opens in Excel, Numbers, or Google Sheets).

## Honest limits
- **Most scans find nothing.** That's the system working: it only flags real gaps.
- An alert means the price looks cheap compared with sportsbooks. It doesn't account for
  injury news the books haven't priced yet, and that's why you check injuries first.
- Polymarket's US app can show slightly different prices from the public data feed. The
  "Buy only at" number protects you, so don't pay more than it says.
- Only **moneylines** (who wins) in two-sided sports. No spreads, props, or combos.
- **The test:** after 50+ logged bets, if you're not beating the price you'd get right
  before tip-off on most bets, the edge isn't real. Stop or rethink.
- Gains are taxable. Keep the CSV for your CPA.

## Settings reference (`config.json`)
| Key | Default | Meaning |
|---|---|---|
| `sports` | NBA, NFL, NHL | Odds API sport keys (also `basketball_ncaab`, `americanfootball_ncaaf`, `baseball_mlb`) |
| `hours_ahead` | 24 | Only scan games starting within this many hours |
| `edge_threshold` | 0.04 | Minimum edge (4 points) to alert |
| `price_cushion` | 0.01 | Added to Polymarket's price for fees/slippage |
| `kelly_fraction` | 0.25 | Quarter Kelly |
| `max_bet_pct` / `max_bet_dollars` | 0.03 / 5 | Stake caps |
| `min_price` / `max_price` | 0.10 / 0.75 | Skip long shots and heavy favorites |
| `realert_improvement` | 0.02 | Re-alert only if the price drops this much more |

## Tests
```bash
python -m unittest discover -s tests -v
```
