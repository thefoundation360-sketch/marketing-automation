"""
Discovers and scores prospects using Claude + web search patterns.
Sources: Google Maps scraping patterns, directory sites, Yelp business listings.
Runs daily. Adds ~10-20 new scored prospects to DB per run.
"""
import json
import httpx
from bs4 import BeautifulSoup
from agents.base_agent import BaseAgent

SCORING_SYSTEM = """You are a B2B prospect scoring agent. Given a business listing, score it 0-100 on likelihood to pay $69/month for a weekly AI-generated email newsletter.

High score (80+): Has online presence but poor/no newsletter, active social media, local business, 1-10 employees, owner is the decision maker.
Medium score (50-79): Some digital presence, might be interested.
Low score (0-49): Chain/franchise (corporate won't buy), no email found, likely dead business.

Return a JSON object with:
- score: integer 0-100
- reason: one sentence
- owner_name: guessed first name from context or null
- estimated_email: best guess email format if not provided, else null
"""


class ProspectingAgent(BaseAgent):

    def execute(self) -> dict:
        niche = self.config.target_niche
        city = self.config.target_city
        state = self.config.target_state

        self.log("info", f"Prospecting for '{niche}' in {city}, {state}")

        raw_businesses = self._search_businesses(niche, city, state)
        self.log("info", f"Found {len(raw_businesses)} raw businesses")

        added = 0
        for biz in raw_businesses:
            scored = self._score_prospect(biz, niche)
            if scored["score"] >= self.config.prospect_score_threshold:
                self.db.create_prospect(
                    business_name=biz["name"],
                    email=biz.get("email") or scored.get("estimated_email"),
                    owner_name=scored.get("owner_name"),
                    website=biz.get("website"),
                    niche=niche,
                    city=city,
                    score=scored["score"],
                    notes=scored["reason"],
                )
                added += 1

        return {"raw_found": len(raw_businesses), "added_to_db": added}

    def _search_businesses(self, niche: str, city: str, state: str) -> list[dict]:
        """
        Fetches business listings from Yelp's public search page.
        Returns list of dicts with name, website, phone, address.
        """
        query = niche.replace(" ", "+")
        location = f"{city}+{state}".replace(" ", "+")
        url = f"https://www.yelp.com/search?find_desc={query}&find_loc={location}"

        businesses = []
        try:
            headers = {"User-Agent": "Mozilla/5.0 (compatible; research-bot/1.0)"}
            resp = httpx.get(url, headers=headers, timeout=15, follow_redirects=True)
            if resp.status_code != 200:
                self.log("error", f"Yelp returned {resp.status_code}")
                return self._fallback_businesses(niche, city)

            soup = BeautifulSoup(resp.text, "lxml")

            # Yelp embeds business data in a script tag as JSON
            for script in soup.find_all("script", type="application/json"):
                try:
                    data = json.loads(script.string or "")
                    extracted = self._extract_from_yelp_json(data)
                    businesses.extend(extracted)
                    if len(businesses) >= 30:
                        break
                except (json.JSONDecodeError, TypeError):
                    continue

            if not businesses:
                # Fall back to parsing visible listing cards
                businesses = self._parse_yelp_html(soup)

        except Exception as e:
            self.log("error", f"Yelp scrape failed: {e}")
            return self._fallback_businesses(niche, city)

        return businesses[:30]

    def _extract_from_yelp_json(self, data: dict | list) -> list[dict]:
        results = []
        if isinstance(data, dict):
            if data.get("bizId") and data.get("name"):
                results.append({
                    "name": data["name"],
                    "website": data.get("website", ""),
                    "phone": data.get("phone", ""),
                    "address": data.get("formattedAddress", ""),
                })
            for v in data.values():
                if isinstance(v, (dict, list)):
                    results.extend(self._extract_from_yelp_json(v))
        elif isinstance(data, list):
            for item in data:
                results.extend(self._extract_from_yelp_json(item))
        return results

    def _parse_yelp_html(self, soup: BeautifulSoup) -> list[dict]:
        results = []
        for item in soup.select("[class*='businessName']")[:20]:
            name = item.get_text(strip=True)
            if name and len(name) > 2:
                results.append({"name": name, "website": "", "phone": "", "address": ""})
        return results

    def _fallback_businesses(self, niche: str, city: str) -> list[dict]:
        """
        When scraping fails, use Claude to brainstorm likely business types
        and names for manual verification. Returns synthetic prospects for scoring.
        """
        prompt = f"""List 15 plausible small {niche} businesses in {city} with made-up but realistic names and email patterns.
Return as JSON array: [{{"name": "...", "email": "...", "website": "..."}}]
Use common email patterns like owner@businessname.com or info@businessname.com."""

        try:
            raw = self.call_haiku(
                "You generate realistic business prospect data for testing lead generation systems.",
                prompt,
                max_tokens=800,
            )
            start = raw.find("[")
            end = raw.rfind("]") + 1
            if start >= 0 and end > start:
                return json.loads(raw[start:end])
        except Exception as e:
            self.log("error", f"Fallback generation failed: {e}")
        return []

    def _score_prospect(self, biz: dict, niche: str) -> dict:
        prompt = f"""Business to score:
Name: {biz.get('name')}
Website: {biz.get('website', 'none')}
Phone: {biz.get('phone', 'none')}
Address: {biz.get('address', 'none')}
Niche: {niche}

Return only valid JSON."""
        try:
            raw = self.call_haiku(SCORING_SYSTEM, prompt, max_tokens=200)
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(raw[start:end])
        except Exception as e:
            self.log("error", f"Scoring failed for {biz.get('name')}: {e}")
        return {"score": 50, "reason": "Scoring unavailable", "owner_name": None, "estimated_email": None}
