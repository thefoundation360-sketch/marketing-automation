"""Send bet alerts to your phone. Use any (or all) of:

- GitHub notifications (when running in GitHub Actions on a PRIVATE repo: each alert becomes
  an issue assigned to you, which the GitHub app pushes to your phone)
- ntfy (free push notifications: install the ntfy app, subscribe to your topic)
- a Make.com webhook (then route it to SMS, Slack, or an Airtable row)
- email (Gmail with an app password)
"""

import os
import smtplib
from email.message import EmailMessage

import requests

import secure_alerts

GITHUB_API = "https://api.github.com"
_repo_private_cache = {}


def github_issue_alert(title, body, env=None, session=None):
    """Open a GitHub issue assigned to the repo owner. Returns True if created.

    Only runs inside GitHub Actions with ALERT_GITHUB_ISSUES=true, and only on a PRIVATE repo,
    so picks are never published on a public repo.
    """
    env = env if env is not None else os.environ
    http = session or requests
    if env.get("ALERT_GITHUB_ISSUES") != "true":
        return False
    token, repo = env.get("GITHUB_TOKEN"), env.get("GITHUB_REPOSITORY")
    if not token or not repo:
        return False
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    if repo not in _repo_private_cache:
        info = http.get(f"{GITHUB_API}/repos/{repo}", headers=headers, timeout=15)
        info.raise_for_status()
        _repo_private_cache[repo] = bool(info.json().get("private"))
    if not _repo_private_cache[repo]:
        print("  ! GitHub alert skipped: repo is PUBLIC. Make it private to get alerts in the GitHub app.")
        return False
    owner = env.get("GITHUB_REPOSITORY_OWNER") or repo.split("/")[0]
    resp = http.post(
        f"{GITHUB_API}/repos/{repo}/issues",
        headers=headers,
        json={"title": title, "body": body.replace("\n", "  \n"), "labels": ["bet-alert"], "assignees": [owner]},
        timeout=15,
    )
    resp.raise_for_status()
    return True


def send_all(alert_cfg, title, body, payload):
    """Send through every configured channel. Returns a list of channel names that worked."""
    sent = []
    try:
        if secure_alerts.log_encrypted_alert(title, body):
            sent.append("encrypted-log")
    except Exception as e:  # never let alert encryption break a scan
        print(f"  ! Encrypted log alert failed: {type(e).__name__}")
    try:
        if github_issue_alert(title, body):
            sent.append("github")
    except requests.RequestException as e:
        print(f"  ! GitHub alert failed: {e}")

    topic = (alert_cfg or {}).get("ntfy_topic")
    if topic:
        try:
            requests.post(
                f"https://ntfy.sh/{topic}",
                data=body.encode("utf-8"),
                headers={"Title": title.encode("ascii", "ignore").decode(), "Priority": "high"},
                timeout=15,
            ).raise_for_status()
            sent.append("ntfy")
        except requests.RequestException as e:
            print(f"  ! ntfy alert failed: {e}")

    hook = (alert_cfg or {}).get("make_webhook_url")
    if hook:
        try:
            requests.post(hook, json=payload, timeout=15).raise_for_status()
            sent.append("make")
        except requests.RequestException as e:
            print(f"  ! Make webhook failed: {e}")

    email = (alert_cfg or {}).get("email") or {}
    if email.get("enabled"):
        try:
            msg = EmailMessage()
            msg["Subject"] = title
            msg["From"] = email["username"]
            msg["To"] = email["to"]
            msg.set_content(body)
            with smtplib.SMTP(email.get("smtp_host", "smtp.gmail.com"), int(email.get("smtp_port", 587))) as s:
                s.starttls()
                s.login(email["username"], email["app_password"])
                s.send_message(msg)
            sent.append("email")
        except (OSError, smtplib.SMTPException, KeyError) as e:
            print(f"  ! Email alert failed: {e}")
    return sent
