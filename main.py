"""
CLI entry point for all agent operations.

Usage:
  python main.py run --agent prospect          # Find new prospects
  python main.py run --agent outreach          # Send outreach emails
  python main.py run --agent content           # Generate newsletters
  python main.py run --agent delivery          # Send generated newsletters
  python main.py run --agent monitor           # Run monitoring check
  python main.py run --agent all               # Full daily run

  python main.py onboard --name "Jane Smith" --business "FitLife Studio" --email jane@fitlife.com
  python main.py status                        # Print system status
  python main.py preview --client-id <id>      # Preview next newsletter
  python main.py add-prospect --file leads.csv # Bulk import prospects
"""
import click
import json
import sys
from core.config import Config
from core.database import Database
from agents.prospecting_agent import ProspectingAgent
from agents.outreach_agent import OutreachAgent
from agents.onboarding_agent import OnboardingAgent
from agents.content_agent import ContentAgent
from agents.delivery_agent import DeliveryAgent
from agents.monitoring_agent import MonitoringAgent


def get_deps():
    config = Config.from_env()
    db = Database(config.database_path)
    return config, db


@click.group()
def cli():
    pass


@cli.command()
@click.option("--agent", required=True,
              type=click.Choice(["prospect", "outreach", "content", "delivery", "monitor", "all"]))
def run(agent):
    """Run a specific agent or the full daily pipeline."""
    config, db = get_deps()

    agents = {
        "prospect": ProspectingAgent,
        "outreach": OutreachAgent,
        "content": ContentAgent,
        "delivery": DeliveryAgent,
        "monitor": MonitoringAgent,
    }

    if agent == "all":
        sequence = ["prospect", "outreach", "content", "delivery", "monitor"]
    else:
        sequence = [agent]

    for name in sequence:
        click.echo(f"\nRunning {name} agent...")
        try:
            instance = agents[name](config, db)
            result = instance.run()
            click.echo(f"  Done: {json.dumps(result)}")
        except Exception as e:
            click.echo(f"  FAILED: {e}", err=True)
            if agent != "all":
                sys.exit(1)


@cli.command()
@click.option("--name", required=True, help="Client's full name")
@click.option("--business", required=True, help="Business name")
@click.option("--email", required=True, help="Client email")
@click.option("--niche", default=None, help="Override target niche")
def onboard(name, business, email, niche):
    """Manually onboard a new client and send them a payment link."""
    config, db = get_deps()
    agent = OnboardingAgent(config, db)
    result = agent.onboard_client(name, business, email, niche)
    click.echo(f"\nClient onboarded successfully!")
    click.echo(f"  Client ID: {result['client_id']}")
    click.echo(f"  Payment link: {result['payment_link']}")
    click.echo(f"\nA welcome email with the payment link has been sent to {email}.")


@cli.command()
def status():
    """Print current system status."""
    config, db = get_deps()

    with db._conn() as conn:
        clients = {r["status"]: r["n"] for r in conn.execute(
            "SELECT status, COUNT(*) as n FROM clients GROUP BY status"
        ).fetchall()}
        prospects = {r["stage"]: r["n"] for r in conn.execute(
            "SELECT stage, COUNT(*) as n FROM prospects GROUP BY stage"
        ).fetchall()}
        nl_stats = db.get_newsletter_stats()
        recent_errors = db.get_recent_errors(hours=48)
        last_runs = conn.execute(
            "SELECT agent, status, finished_at FROM agent_runs ORDER BY started_at DESC LIMIT 20"
        ).fetchall()

    active = clients.get("active", 0)
    click.echo(f"\n{'='*50}")
    click.echo(f"  {config.business_name} — System Status")
    click.echo(f"{'='*50}")
    click.echo(f"\nREVENUE")
    click.echo(f"  Active clients:  {active}")
    click.echo(f"  MRR:             ${active * 69:.2f}")
    click.echo(f"  Client breakdown: {dict(clients)}")

    click.echo(f"\nNEWSLETTERS")
    click.echo(f"  Total generated: {nl_stats.get('total', 0)}")
    click.echo(f"  Total sent:      {nl_stats.get('sent', 0)}")

    click.echo(f"\nPROSPECT PIPELINE")
    for stage, count in prospects.items():
        click.echo(f"  {stage:15s} {count}")

    click.echo(f"\nRECENT ERRORS ({len(recent_errors)} in last 48h)")
    for e in recent_errors[:5]:
        click.echo(f"  [{e['agent']}] {e['message'][:60]}")

    click.echo(f"\nAGENT LAST RUNS")
    seen = set()
    for r in last_runs:
        if r["agent"] not in seen:
            seen.add(r["agent"])
            click.echo(f"  {r['agent']:25s} {r['status']:10s} {r['finished_at'] or 'running'}")
    click.echo()


@cli.command()
@click.option("--client-id", required=True)
def preview(client_id):
    """Generate and print a newsletter preview for a client (does not send)."""
    config, db = get_deps()
    with db._conn() as conn:
        row = conn.execute("SELECT * FROM clients WHERE id=?", (client_id,)).fetchone()
    if not row:
        click.echo(f"Client {client_id} not found.")
        sys.exit(1)

    client = dict(row)
    click.echo(f"\nGenerating preview for {client['business_name']}...")
    agent = ContentAgent(config, db)
    agent._generate_for_client(client)

    # Fetch the draft just created
    with db._conn() as conn:
        nl = conn.execute(
            "SELECT * FROM newsletters WHERE client_id=? AND status='draft' ORDER BY created_at DESC LIMIT 1",
            (client_id,)
        ).fetchone()

    if nl:
        nl = dict(nl)
        click.echo(f"\nSUBJECT: {nl['subject']}")
        click.echo(f"\n{'─'*60}")
        click.echo(nl.get("content_text", nl["content_html"])[:2000])
    else:
        click.echo("No draft generated.")


@cli.command("add-prospect")
@click.option("--name", required=True, help="Business name")
@click.option("--email", required=True)
@click.option("--owner", default=None)
@click.option("--website", default=None)
@click.option("--score", default=80, type=int)
def add_prospect(name, email, owner, website, score):
    """Manually add a single prospect."""
    config, db = get_deps()
    pid = db.create_prospect(
        business_name=name,
        email=email,
        owner_name=owner,
        website=website,
        niche=config.target_niche,
        city=config.target_city,
        score=score,
    )
    click.echo(f"Added prospect: {name} ({email}) — ID: {pid}")


if __name__ == "__main__":
    cli()
