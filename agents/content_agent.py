"""
The product. Generates a personalized weekly newsletter for each active client.
Uses Claude Sonnet (quality matters here) + web research for current content.
Prompt caching on system prompts reduces cost ~60% on repeated runs.
"""
import json
import httpx
from datetime import datetime
from bs4 import BeautifulSoup
from agents.base_agent import BaseAgent

NEWSLETTER_SYSTEM = """You are an expert newsletter writer for small local businesses.
You write weekly email newsletters that:
- Feel personal and locally relevant, not generic AI-generated content
- Mix practical tips, industry news, and a human moment (a story, question, or observation)
- Are 350-500 words — substantial but readable in 90 seconds
- Use the business owner's voice based on their stated tone preference
- Always end with one clear call-to-action relevant to their current goal
- Format: plain HTML with minimal styling (h2, p, strong tags only)

Never use bullet points. Write in paragraphs. Never mention AI."""

RESEARCH_SYSTEM = """You are a research assistant. Given a niche and week, identify:
1. One genuinely useful tip or insight for this type of business (not generic)
2. One industry trend or news item from the past week
3. One question the business owner could ask their clients to drive engagement

Return as JSON: {"tip": "...", "news": "...", "engagement_question": "..."}"""


class ContentAgent(BaseAgent):

    def execute(self) -> dict:
        clients = self.db.get_active_clients()
        self.log("info", f"Generating newsletters for {len(clients)} active clients")

        results = {"generated": 0, "failed": 0}
        for client in clients:
            try:
                self._generate_for_client(client)
                results["generated"] += 1
            except Exception as e:
                self.log("error", f"Failed for client {client['id']}: {e}")
                results["failed"] += 1

        return results

    def _generate_for_client(self, client: dict):
        prefs = json.loads(client.get("preferences") or "{}")
        niche = client["niche"]
        biz_name = client["business_name"]
        owner_name = client["name"]

        research = self._research_niche(niche)
        week_str = datetime.now().strftime("%B %d, %Y")

        prompt = f"""Write a weekly newsletter for:
- Business: {biz_name} (owner: {owner_name})
- Type: {niche}
- Newsletter goal: {prefs.get('goal', 'keep clients engaged')}
- Target audience: {prefs.get('target_audience', 'their customers')}
- Brand tone: {prefs.get('tone', 'friendly and professional')}
- Avoid: {prefs.get('avoid_topics', 'nothing specific')}
- Upcoming news: {prefs.get('upcoming_news', 'none')}

This week's research to weave in:
- Tip: {research.get('tip', '')}
- Industry news: {research.get('news', '')}
- Engagement question: {research.get('engagement_question', '')}

Week of: {week_str}

Write the full newsletter HTML now. Start with a warm subject line suggestion on the first line (prefix "SUBJECT: "), then the HTML body."""

        content = self.call_sonnet(NEWSLETTER_SYSTEM, prompt, max_tokens=1200)

        # Extract subject and body
        lines = content.split("\n", 2)
        subject = f"{self.config.newsletter_subject_prefix} Your Weekly Update"
        body_html = content

        for i, line in enumerate(lines[:3]):
            if line.strip().upper().startswith("SUBJECT:"):
                subject_text = line.split(":", 1)[1].strip()
                subject = f"{self.config.newsletter_subject_prefix} {subject_text}"
                body_html = "\n".join(lines[i+1:]).strip()
                break

        # Wrap in minimal email-safe HTML
        body_html = self._wrap_html(body_html, owner_name, biz_name)
        body_text = BeautifulSoup(body_html, "lxml").get_text(separator="\n").strip()

        newsletter_id = self.db.create_newsletter(
            client["id"], subject, body_html, body_text
        )
        self.log("info", f"Generated newsletter {newsletter_id} for {biz_name}")
        return newsletter_id

    def _research_niche(self, niche: str) -> dict:
        """Uses Claude to synthesize current industry knowledge for the niche."""
        week_str = datetime.now().strftime("week of %B %d, %Y")
        prompt = f"""For {niche} businesses, for the {week_str}:
Provide one actionable tip, one relevant industry development, and one client engagement question.
Return only JSON."""
        try:
            raw = self.call_haiku(RESEARCH_SYSTEM, prompt, max_tokens=300)
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(raw[start:end])
        except Exception as e:
            self.log("error", f"Research failed: {e}")
        return {
            "tip": f"Focus on delivering an exceptional client experience this week.",
            "news": f"The {niche} industry continues to see strong demand for personalized service.",
            "engagement_question": "What's one thing we could do to make your experience even better?",
        }

    def _wrap_html(self, content: str, owner_name: str, biz_name: str) -> str:
        week_str = datetime.now().strftime("%B %d, %Y")
        return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body {{ font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.7; }}
  h2 {{ color: #222; font-size: 1.3em; margin-top: 1.5em; }}
  .footer {{ margin-top: 2em; padding-top: 1em; border-top: 1px solid #eee; font-size: 0.85em; color: #999; }}
</style>
</head>
<body>
{content}
<div class="footer">
  <p>{biz_name} | {week_str}<br>
  You're receiving this because you're a valued client.<br>
  <a href="{{{{unsubscribe_url}}}}">Unsubscribe</a></p>
</div>
</body>
</html>"""
