#!/usr/bin/env python3
"""
Credit Score & Dispute Tracker
CLI dashboard for tracking disputes, deadlines, and score progress.
"""

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

try:
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.progress import Progress, BarColumn, TextColumn
    from rich.columns import Columns
    from rich.text import Text
    from rich import box
    import questionary
except ImportError:
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "rich", "questionary", "-q"])
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.progress import Progress, BarColumn, TextColumn
    from rich.columns import Columns
    from rich.text import Text
    from rich import box
    import questionary

TRACKER_FILE = Path(__file__).parent.parent / "generated_letters" / "tracker_db.json"
console = Console()

TARGET_SCORE = 800
START_SCORE  = 563

SCORE_MILESTONES = [
    (580,  "First dispute deletions possible"),
    (620,  "Unsecured credit cards open up"),
    (640,  "FHA mortgage eligible"),
    (660,  "Entry rewards cards (Discover It)"),
    (680,  "Good credit tier — real options"),
    (700,  "Premium travel cards accessible"),
    (720,  "Best auto loan rates (~3-4% APR)"),
    (740,  "Best mortgage rate tier"),
    (760,  "Elite access — negotiate anything"),
    (780,  "Near-perfect — virtually no denials"),
    (800,  "TOP 1% — MISSION COMPLETE 🏆"),
]


def load_db():
    if TRACKER_FILE.exists():
        with open(TRACKER_FILE) as f:
            return json.load(f)
    return {
        "profile": {"name": "Unknown", "start_score": START_SCORE, "start_date": datetime.now().isoformat()},
        "disputes": [],
        "score_log": [{"date": datetime.now().strftime("%Y-%m-%d"), "score": START_SCORE, "note": "Baseline"}],
        "cfpb_complaints": [],
    }


def save_db(db):
    TRACKER_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(TRACKER_FILE, "w") as f:
        json.dump(db, f, indent=2)


def score_bar(current, start=START_SCORE, target=TARGET_SCORE):
    pct = min((current - start) / (target - start), 1.0)
    filled = int(pct * 40)
    bar = "█" * filled + "░" * (40 - filled)
    return f"[green]{bar}[/green] {int(pct*100)}%"


def days_until(date_str):
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d")
        diff = (d - datetime.now()).days
        return diff
    except Exception:
        return None


def dashboard(db):
    os.system("clear")
    scores = db["score_log"]
    current_score = scores[-1]["score"] if scores else START_SCORE
    start_score   = db["profile"].get("start_score", START_SCORE)
    gain          = current_score - start_score
    name          = db["profile"].get("name", "Consumer")

    console.print(Panel.fit(
        f"[bold white]CREDIT REPAIR DASHBOARD[/bold white]\n"
        f"[dim]{name}  |  {datetime.now().strftime('%B %d, %Y')}[/dim]",
        border_style="bright_blue"
    ))

    # Score panel
    console.print(f"\n[bold]Current FICO Score:[/bold] [bold bright_green]{current_score}[/bold bright_green]  "
                  f"[dim](started at {start_score}, [green]+{gain} pts[/green])[/dim]")
    console.print(f"[bold]Progress to 800:[/bold]  {score_bar(current_score)}")

    # Next milestone
    next_ms = next(((s, label) for s, label in SCORE_MILESTONES if s > current_score), None)
    if next_ms:
        pts_away = next_ms[0] - current_score
        console.print(f"[bold]Next milestone:[/bold]  [yellow]{next_ms[0]}[/yellow] — {next_ms[1]}  "
                      f"[dim]({pts_away} pts away)[/dim]\n")

    # Disputes table
    disputes = db.get("disputes", [])
    if disputes:
        t = Table(title="Active Disputes", box=box.ROUNDED, border_style="blue", show_lines=True)
        t.add_column("Bureau",    style="bold cyan",  width=12)
        t.add_column("Creditor",  width=18)
        t.add_column("Basis",     width=20)
        t.add_column("Sent",      width=12)
        t.add_column("Deadline",  width=12)
        t.add_column("Days Left", width=10, justify="right")
        t.add_column("Status",    width=14)

        for d in disputes:
            deadline_str = d.get("deadline", "")
            days_left    = days_until(deadline_str) if deadline_str else None
            if days_left is None:
                days_color = "white"
                days_txt   = "—"
            elif days_left < 0:
                days_color = "bright_red"
                days_txt   = f"OVERDUE {abs(days_left)}d"
            elif days_left <= 5:
                days_color = "yellow"
                days_txt   = f"{days_left}d ⚠️"
            else:
                days_color = "green"
                days_txt   = f"{days_left}d"

            status = d.get("status", "Pending")
            status_color = {"Deleted": "bright_green", "Corrected": "green",
                            "Verified": "red", "Pending": "yellow",
                            "Escalated": "bright_yellow"}.get(status, "white")

            t.add_row(
                d.get("bureau", ""),
                d.get("creditor", ""),
                d.get("basis", ""),
                d.get("sent_date", ""),
                deadline_str,
                f"[{days_color}]{days_txt}[/{days_color}]",
                f"[{status_color}]{status}[/{status_color}]",
            )
        console.print(t)
    else:
        console.print("[dim]No disputes logged yet. Choose 'Log a new dispute' from the menu.[/dim]\n")

    # CFPB complaints
    cfpb = db.get("cfpb_complaints", [])
    if cfpb:
        ct = Table(title="CFPB Complaints", box=box.SIMPLE, border_style="yellow")
        ct.add_column("Bureau", style="bold")
        ct.add_column("Filed")
        ct.add_column("Complaint #")
        ct.add_column("Status")
        for c in cfpb:
            ct.add_row(c.get("bureau",""), c.get("filed",""), c.get("complaint_num",""), c.get("status","Filed"))
        console.print(ct)

    # Score history
    if len(scores) > 1:
        st = Table(title="Score History", box=box.SIMPLE, border_style="green")
        st.add_column("Date", style="dim")
        st.add_column("Score", style="bold bright_green", justify="right")
        st.add_column("Change", justify="right")
        st.add_column("Note")
        for i, entry in enumerate(scores):
            prev  = scores[i-1]["score"] if i > 0 else entry["score"]
            delta = entry["score"] - prev
            delta_txt = f"[green]+{delta}[/green]" if delta > 0 else (f"[red]{delta}[/red]" if delta < 0 else "—")
            st.add_row(entry["date"], str(entry["score"]), delta_txt if i > 0 else "—", entry.get("note",""))
        console.print(st)


def add_dispute(db):
    bureaus  = ["TransUnion", "Experian", "Equifax", "All 3"]
    statuses = ["Pending", "Verified", "Corrected", "Deleted", "Escalated"]

    creditor = questionary.text("Creditor / Agency name:").ask()
    bureau   = questionary.select("Bureau:", choices=bureaus).ask()
    basis    = questionary.text("Basis for dispute:").ask()
    sent     = questionary.text(f"Date sent (YYYY-MM-DD, default today {datetime.now().strftime('%Y-%m-%d')}):").ask()
    if not sent:
        sent = datetime.now().strftime("%Y-%m-%d")

    try:
        sent_dt  = datetime.strptime(sent, "%Y-%m-%d")
        deadline = (sent_dt + timedelta(days=30)).strftime("%Y-%m-%d")
    except Exception:
        deadline = ""

    status = questionary.select("Current status:", choices=statuses).ask()

    db["disputes"].append({
        "bureau":    bureau,
        "creditor":  creditor,
        "basis":     basis,
        "sent_date": sent,
        "deadline":  deadline,
        "status":    status,
        "updated":   datetime.now().strftime("%Y-%m-%d"),
    })
    save_db(db)
    console.print(f"[green]✓ Dispute logged. 30-day deadline: {deadline}[/green]")


def update_dispute(db):
    disputes = db.get("disputes", [])
    if not disputes:
        console.print("[yellow]No disputes to update.[/yellow]")
        return

    choices = [f"{i+1}. {d['bureau']} — {d['creditor']} ({d['status']})" for i, d in enumerate(disputes)]
    selected = questionary.select("Which dispute to update?", choices=choices).ask()
    idx = int(selected.split(".")[0]) - 1

    statuses = ["Pending", "Verified", "Corrected", "Deleted", "Escalated"]
    new_status = questionary.select("New status:", choices=statuses).ask()
    note = questionary.text("Note (optional):").ask()

    db["disputes"][idx]["status"]  = new_status
    db["disputes"][idx]["updated"] = datetime.now().strftime("%Y-%m-%d")
    if note:
        db["disputes"][idx]["note"] = note

    save_db(db)
    console.print(f"[green]✓ Updated to: {new_status}[/green]")


def log_score(db):
    score = questionary.text("New score:").ask()
    note  = questionary.text("What changed? (e.g. 'Collection deleted', 'Paid down Visa'):").ask()
    db["score_log"].append({
        "date":  datetime.now().strftime("%Y-%m-%d"),
        "score": int(score),
        "note":  note,
    })
    save_db(db)
    prev = db["score_log"][-2]["score"] if len(db["score_log"]) > 1 else int(score)
    delta = int(score) - prev
    console.print(f"[green]✓ Score logged: {score}  ({'+' if delta>=0 else ''}{delta} pts)[/green]")


def log_cfpb(db):
    bureau = questionary.select("Which bureau?", choices=["TransUnion", "Experian", "Equifax"]).ask()
    num    = questionary.text("CFPB Complaint # (from confirmation email):").ask()
    db["cfpb_complaints"].append({
        "bureau":       bureau,
        "filed":        datetime.now().strftime("%Y-%m-%d"),
        "complaint_num":num,
        "status":       "Filed",
    })
    save_db(db)
    console.print(f"[green]✓ CFPB complaint logged for {bureau}[/green]")


def check_deadlines(db):
    console.print("\n[bold]⏰ Deadline Check[/bold]")
    urgent = [(d, days_until(d.get("deadline",""))) for d in db.get("disputes",[]) if d.get("deadline")]
    urgent.sort(key=lambda x: x[1] if x[1] is not None else 999)
    for d, days in urgent:
        if days is None:
            continue
        if days < 0:
            console.print(f"[bold red]  ⛔ OVERDUE {abs(days)} DAYS: {d['bureau']} — {d['creditor']} (deadline was {d['deadline']})[/bold red]")
            console.print(f"     → File CFPB complaint immediately at consumerfinance.gov/complaint")
        elif days <= 5:
            console.print(f"[bold yellow]  ⚠️  {days} days left: {d['bureau']} — {d['creditor']} (deadline {d['deadline']})[/bold yellow]")
        else:
            console.print(f"[green]  ✓  {days} days left: {d['bureau']} — {d['creditor']}[/green]")


def main():
    db = load_db()

    if db["profile"]["name"] == "Unknown":
        console.print(Panel("[bold]First run — let's set up your profile[/bold]", border_style="blue"))
        db["profile"]["name"]        = questionary.text("Your full name:").ask()
        db["profile"]["start_score"] = int(questionary.text("Starting FICO score (563):").ask() or "563")
        db["profile"]["start_date"]  = datetime.now().isoformat()
        db["score_log"] = [{"date": datetime.now().strftime("%Y-%m-%d"), "score": db["profile"]["start_score"], "note": "Baseline"}]
        save_db(db)

    while True:
        dashboard(db)
        check_deadlines(db)

        action = questionary.select(
            "\nWhat would you like to do?",
            choices=[
                "Log a new dispute",
                "Update dispute status",
                "Log a new score",
                "Log CFPB complaint #",
                "Refresh dashboard",
                "Exit",
            ]
        ).ask()

        if action == "Log a new dispute":
            add_dispute(db)
        elif action == "Update dispute status":
            update_dispute(db)
        elif action == "Log a new score":
            log_score(db)
        elif action == "Log CFPB complaint #":
            log_cfpb(db)
        elif action == "Refresh dashboard":
            db = load_db()
        elif action == "Exit":
            console.print("[bold green]Stay consistent — 800 is coming. 💪[/bold green]\n")
            break


if __name__ == "__main__":
    main()
