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
1. Pulls sportsbook moneylines and removes the books' cut to get a **fair win %**. By default it
   uses **ESPN's free feed** (no key, one book, usually DraftKings). With an optional free key from
   The Odds API it uses the median of many books, or sharp books like Pinnacle/LowVig when listed.
2. Pulls Polymarket's buy price for the same game (public data, no login).
3. If fair % minus (Polymarket price + 1% cushion for fees/slippage) is **4 points or more**,
   it alerts you. It skips heavy favorites over 75% and long shots under 10%.
4. Stake = quarter Kelly, capped at **3% of bankroll and $5**, rounded down to $0.50.
5. It logs every alert to `data/opportunities.csv` and won't re-alert the same bet unless
   the price drops another 2 points.

## Easiest: run it on GitHub (no laptop needed)

GitHub runs the scanner for you at about **11am, 3pm and 6pm Central** every day, for free
(this repo is public, and Actions are free for public repos). Alerts go to your phone and
rows go to Airtable.

**One-time steps:**
1. **Merge** this branch into `main`. GitHub only runs schedules from the main branch.
2. Get your keys (none are required. Without any, it scans and logs nothing):
   - Phone alerts: install the free **ntfy** app → tap **+** → subscribe to a random name
     you make up, like `bets-7k2q9x4m`. Anyone who knows the name can read it, so make it random.
   - Airtable (optional): an empty base called **Betting** plus a token (steps under
     "Airtable bet log" below).
3. On GitHub: **Settings → Secrets and variables → Actions → New repository secret**, and add:

   | Secret name | Value |
   |---|---|
   | `ODDS_API_KEY` | optional: Odds API key for sharper odds (ESPN's free odds are used without it) |
   | `NTFY_TOPIC` | your ntfy topic name |
   | `BANKROLL` | your balance, e.g. `105` |
   | `AIRTABLE_TOKEN` | Airtable token (starts with `pat`) |
   | `AIRTABLE_BASE_ID` | Airtable base ID (starts with `app`) |

4. Test it: **Actions tab → Bet Scanner → Run workflow**. It creates the Airtable table on
   the first run, then scans.

Notes:
- Secrets stay hidden even though the repo is public. The scanner runs with `--quiet` so
  your picks never show in the public logs; the details only go to your phone and Airtable.
- Update `BANKROLL` the same way every Sunday.
- GitHub pauses schedules after 60 days with no repo activity. If alerts stop, open
  **Actions → Bet Scanner** and click **Enable workflow**.
- To change the scan times, edit the `cron` lines in `.github/workflows/bet-scanner.yml`.

## Or run it on your laptop

### Setup (about 10 minutes, one time)

**0. Get the code onto your laptop.** On GitHub, open this repo, switch to the
`claude/sports-betting-analysis-picks-h7aom0` branch, then click **Code → Download ZIP** and unzip it.

**1. Install Python** if you don't have it: https://www.python.org/downloads/
(On Windows, tick **"Add Python to PATH"** during install.)

**2. Start it:**
- **Mac:** open Terminal, type `bash ` (with a space), drag `start_mac.command` into the window, press Enter.
- **Windows:** double-click `start_windows.bat`.

The first run installs everything and opens the **setup wizard**, which walks you through:
1. A free Odds API key (it opens the signup page for you).
2. Your bankroll.
3. Phone alerts: it generates a private **ntfy** topic. Install the free ntfy app,
   subscribe to that topic, and it sends a test alert.
4. Airtable (optional, recommended). See below.
5. A test scan that prints results without sending anything.

After that, the same start file just runs the scanner every 3 hours. Re-run the wizard any
time with `python setup.py`.

## Airtable bet log (automatic)

When Airtable is connected, every scan:
1. **Adds a row** for each new alert (pick, game, start time, prices, edge, suggested stake, Polymarket link).
2. **Updates "Latest Price"** on open bets until tip-off, so you can see if you beat the closing price.
3. **Settles Win/Loss** about 3 hours after the start, using Polymarket's own resolution.
4. **Fills "Paper Profit"** (what the suggested stake would have made) and **"Profit"** (your real bet).

**Your only job in Airtable:** when you actually bet, tick **Placed?** and type **Stake Placed**
(and **Price Got** if you paid a different price than the alert). The rest fills itself in.

"Paper Profit" tracks every alert even when you skip it. After about 50 rows it tells you
whether the system has a real edge before you trust it with more money.

**Connecting it (the wizard asks for these):**
1. In Airtable, create an empty base called **Betting**. Copy the part of its web address that
   starts with `app`. That's the **base ID**.
2. Go to https://airtable.com/create/tokens → **Create token** → add these 4 scopes:
   `data.records:read`, `data.records:write`, `schema.bases:read`, `schema.bases:write` →
   under **Access**, add the Betting base → copy the token (starts with `pat`).
3. Paste both into the wizard. It creates a **Bets** table with every field automatically.
   (Manual alternative: put them in `config.json` under `airtable`, then run
   `python airtable_log.py --setup`.)

Tip: in Airtable, add a **Summary bar** (sum of Paper Profit and Profit) and a filter
`Placed? = checked` for your real bets.

### Manual setup (without the wizard)
```bash
cd bet_scanner
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp config.example.json config.json                    # then edit config.json
python scanner.py --dry-run
```

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
4. In Airtable, tick **Placed?** and enter **Stake Placed**. Results and profit fill in automatically.
   (No Airtable? Every alert is also saved in `data/opportunities.csv`.)

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
