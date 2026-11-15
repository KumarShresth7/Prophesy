"""Oracle service configuration."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

PROMPTS_DIR = Path(__file__).parent / "prompts"


@dataclass(frozen=True)
class Settings:
    backend_url: str
    oracle_secret: str
    openai_api_key: str
    openai_model: str
    search_max_results: int
    poll_interval_sec: int
    enable_worker: bool

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            backend_url=os.getenv("BACKEND_URL", "http://localhost:8080").rstrip("/"),
            oracle_secret=os.getenv("ORACLE_SECRET", "dev-oracle-secret"),
            openai_api_key=os.getenv("OPENAI_API_KEY", "").strip(),
            openai_model=os.getenv("OPENAI_MODEL", "gpt-4o"),
            search_max_results=int(os.getenv("SEARCH_MAX_RESULTS", "5")),
            poll_interval_sec=int(os.getenv("ORACLE_POLL_INTERVAL_SEC", "300")),
            enable_worker=os.getenv("ORACLE_ENABLE_WORKER", "false").lower() in ("1", "true", "yes"),
        )


settings = Settings.from_env()


def load_system_prompt() -> str:
    path = PROMPTS_DIR / "system.txt"
    if path.is_file():
        return path.read_text(encoding="utf-8").strip()
    return "You are a prediction market oracle. Return JSON: {\"outcome\":\"YES\"|\"NO\",\"evidence\":\"...\",\"confidence\":0.9}"
