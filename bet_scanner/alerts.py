"""Send bet alerts to your phone. Use any (or all) of:

- ntfy (free push notifications: install the ntfy app, subscribe to your topic)
- a Make.com webhook (then route it to SMS, Slack, or an Airtable row)
- email (Gmail with an app password)
"""

import smtplib
from email.message import EmailMessage

import requests


def send_all(alert_cfg, title, body, payload):
    """Send through every configured channel. Returns a list of channel names that worked."""
    sent = []
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
