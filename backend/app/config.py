"""Application configuration.

Everything configurable lives here, sourced from environment variables /
a local ``.env`` file. No secrets are ever hardcoded.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Core
    app_name: str = "Cyclowareness"
    secret_key: str = "dev-only-secret-change-me"
    database_url: str = "sqlite:///./cyclowareness.db"

    # AI
    anthropic_api_key: str = ""
    ai_model: str = "claude-sonnet-5"

    # Sandbox analyzer: "mock" | "real"
    sandbox_analyzer: str = "mock"
    real_analyzer_backend: str = "virustotal"  # virustotal | cape | hybrid_analysis
    real_analyzer_api_key: str = ""
    real_analyzer_url: str = ""

    # Task queue: "inprocess" | "celery"
    task_runner: str = "inprocess"
    redis_url: str = "redis://localhost:6379/0"

    # Loop pacing — artificial latency so the loop visibly turns in the UI.
    # Real sandbox/AI calls take seconds-to-minutes anyway; the mock keeps
    # that observable quality without real detonation.
    stage_delay_analyze: float = 5.0
    stage_delay_convert: float = 6.0
    stage_delay_target: float = 3.0

    # Behaviour
    auto_approve_training: bool = False
    access_token_expire_minutes: int = 720
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
