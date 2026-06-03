"""
Minimal HTTP server for Stripe webhooks.
Deploy to Railway ($5/month). Single endpoint.
Run: python webhook_server.py
"""
import os
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from core.config import Config
from core.database import Database
from agents.billing_agent import BillingAgent


config = Config.from_env()
db = Database(config.database_path)
billing = BillingAgent(config, db)


class WebhookHandler(BaseHTTPRequestHandler):

    def do_POST(self):
        if self.path != "/webhook/stripe":
            self._respond(404, "Not found")
            return

        length = int(self.headers.get("Content-Length", 0))
        payload = self.rfile.read(length)
        sig = self.headers.get("Stripe-Signature", "")

        try:
            result = billing.handle_event(payload, sig)
            self._respond(200, json.dumps(result))
        except Exception as e:
            billing.log("error", f"Webhook handler error: {e}")
            self._respond(400, str(e))

    def do_GET(self):
        if self.path == "/health":
            self._respond(200, json.dumps({"status": "ok"}))
        else:
            self._respond(404, "Not found")

    def _respond(self, code: int, body: str):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body.encode())

    def log_message(self, format, *args):
        pass  # Suppress default access log noise


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print(f"Webhook server listening on port {port}")
    server = HTTPServer(("0.0.0.0", port), WebhookHandler)
    server.serve_forever()
