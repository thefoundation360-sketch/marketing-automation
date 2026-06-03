import anthropic
from core.config import Config
from core.database import Database


class BaseAgent:
    def __init__(self, config: Config, db: Database):
        self.config = config
        self.db = db
        self.client = anthropic.Anthropic(api_key=config.anthropic_api_key)
        self.name = self.__class__.__name__

    def log(self, level: str, message: str, data: dict = None):
        print(f"[{self.name}] {level.upper()}: {message}")
        self.db.log(self.name, level, message, data)

    def call_haiku(self, system: str, user: str, max_tokens: int = 1000) -> str:
        response = self.client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return response.content[0].text

    def call_sonnet(self, system: str, user: str, max_tokens: int = 4000) -> str:
        response = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return response.content[0].text

    def run(self) -> dict:
        run_id = self.db.start_run(self.name)
        try:
            result = self.execute()
            self.db.finish_run(run_id, result)
            self.log("info", f"Completed successfully", result)
            return result
        except Exception as e:
            self.db.fail_run(run_id, str(e))
            self.log("error", f"Failed: {e}")
            raise

    def execute(self) -> dict:
        raise NotImplementedError
