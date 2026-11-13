"""Encrypted alerts for public logs.

The GitHub workflow runs on a public repo, so its logs are public. Instead of printing picks,
the scanner prints each alert encrypted with a PUBLIC key (alert_public_key.pem, safe to commit):

    ALERT_ENC:<base64 RSA-wrapped key>.<Fernet token>

Only the matching PRIVATE key can read them. It is never committed: it lives only in the
private scheduled task that reads the logs and emails the alerts.

Decrypt (private key in the ALERT_PRIVATE_KEY env var, PEM text):
    python secure_alerts.py < job.log
"""

import base64
import json
import os
import re
import sys
from pathlib import Path

PUBLIC_KEY_PATH = Path(__file__).parent / "alert_public_key.pem"
LINE_RE = re.compile(r"ALERT_ENC:([A-Za-z0-9_\-=]+)\.([A-Za-z0-9_\-=]+)")


def _crypto():
    from cryptography.fernet import Fernet
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    oaep = padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None)
    return Fernet, serialization, oaep


def encrypt_alert(title, body, public_pem):
    Fernet, serialization, oaep = _crypto()
    pub = serialization.load_pem_public_key(public_pem)
    key = Fernet.generate_key()
    token = Fernet(key).encrypt(json.dumps({"title": title, "body": body}).encode("utf-8"))
    wrapped = base64.urlsafe_b64encode(pub.encrypt(key, oaep)).decode()
    return f"ALERT_ENC:{wrapped}.{token.decode()}"


def decrypt_lines(text, private_pem):
    """Return a list of {"title", "body"} for every ALERT_ENC line in `text` (duplicates removed)."""
    Fernet, serialization, oaep = _crypto()
    priv = serialization.load_pem_private_key(private_pem, password=None)
    out, seen = [], set()
    for wrapped, token in LINE_RE.findall(text):
        if token in seen:
            continue
        seen.add(token)
        key = priv.decrypt(base64.urlsafe_b64decode(wrapped), oaep)
        out.append(json.loads(Fernet(key).decrypt(token.encode())))
    return out


def log_encrypted_alert(title, body, env=None):
    """Print an encrypted alert line if enabled (ALERT_ENCRYPT_LOG=true and the public key exists)."""
    env = env if env is not None else os.environ
    if env.get("ALERT_ENCRYPT_LOG") != "true" or not PUBLIC_KEY_PATH.exists():
        return False
    print(encrypt_alert(title, body, PUBLIC_KEY_PATH.read_bytes()), flush=True)
    return True


if __name__ == "__main__":
    pem = os.environ.get("ALERT_PRIVATE_KEY", "").replace("\\n", "\n").encode()
    if not pem.strip():
        sys.exit("Set ALERT_PRIVATE_KEY to the private key PEM.")
    print(json.dumps(decrypt_lines(sys.stdin.read(), pem), indent=2, ensure_ascii=False))
