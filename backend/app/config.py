"""Application configuration.

Everything configurable lives here, sourced from environment variables /
a local ``.env`` file. No secrets are ever hardcoded.

``APP_ENV`` is the load-bearing switch. It defaults to ``production`` on
purpose: a misconfigured deployment must fail loudly rather than quietly
serve demo behaviour to a real customer. Demo-only features (seeding, the
reset endpoint, synthetic simulation outcomes, artificial stage pacing) are
registered only when ``APP_ENV=demo``.
"""
from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_SECRET_KEY = "dev-only-secret-change-me"
MIN_SECRET_KEY_BYTES = 32

# Any secret that has ever appeared in the repo is public. Length alone is not
# safety: the .env.example placeholder is 33 characters and would otherwise
# sail past the minimum-length check, so a deployment that copies the example
# verbatim would run on a published signing key.
_PUBLISHED_SECRETS = frozenset(
    {
        DEFAULT_SECRET_KEY,
        "change-me-to-a-long-random-string",
        "test-secret",
    }
)
_PLACEHOLDER_MARKERS = ("change-me", "changeme", "your-secret", "replace-me", "example")


class UnsafeProductionConfig(RuntimeError):
    """Raised at startup when APP_ENV=production but the config is demo-grade."""


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Core
    app_name: str = "Cyclowareness"
    app_env: Literal["demo", "production"] = "production"
    secret_key: str = DEFAULT_SECRET_KEY
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
    # Demo-only: real sandbox/AI calls take seconds-to-minutes on their own, and
    # a customer should never pay for a sleep. Forced to 0 in production.
    stage_delay_analyze: float = 5.0
    stage_delay_convert: float = 6.0
    stage_delay_target: float = 3.0

    # Behaviour
    auto_approve_training: bool = False
    access_token_expire_minutes: int = 720
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def is_demo(self) -> bool:
        return self.app_env == "demo"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def delay_analyze(self) -> float:
        return self.stage_delay_analyze if self.is_demo else 0.0

    @property
    def delay_convert(self) -> float:
        return self.stage_delay_convert if self.is_demo else 0.0

    @property
    def delay_target(self) -> float:
        return self.stage_delay_target if self.is_demo else 0.0

    @model_validator(mode="after")
    def _reject_demo_grade_production(self) -> "Settings":
        """Refuse to boot a production instance with demo-grade settings.

        Each of these is a total-loss path in production: a known signing key
        lets anyone mint an analyst token; SQLite silently loses concurrent
        writes and has no migration story; localhost CORS means the deployment
        was never actually configured.
        """
        if self.app_env != "production":
            return self

        problems: list[str] = []

        lowered = self.secret_key.lower()
        if self.secret_key in _PUBLISHED_SECRETS or any(
            marker in lowered for marker in _PLACEHOLDER_MARKERS
        ):
            problems.append(
                "SECRET_KEY is a placeholder published in this repository — anyone "
                "can mint an analyst token with it. Generate one with: "
                "python -c \"import secrets; print(secrets.token_urlsafe(48))\""
            )
        elif len(self.secret_key.encode()) < MIN_SECRET_KEY_BYTES:
            problems.append(
                f"SECRET_KEY is shorter than {MIN_SECRET_KEY_BYTES} bytes "
                f"(got {len(self.secret_key.encode())})"
            )

        if self.database_url.startswith("sqlite"):
            problems.append("DATABASE_URL points at SQLite; use PostgreSQL in production")

        if self.sandbox_analyzer != "real":
            problems.append(
                "SANDBOX_ANALYZER=mock invents its forensic observations. In production those "
                "fabricated findings are shown to an analyst as sandbox evidence and are written "
                "into employee training as fact. Set SANDBOX_ANALYZER=real with a "
                "REAL_ANALYZER_API_KEY, or run APP_ENV=demo."
            )

        localhost_origins = [
            o for o in self.cors_origin_list if "localhost" in o or "127.0.0.1" in o
        ]
        if localhost_origins:
            problems.append(f"CORS_ORIGINS still contains localhost entries: {localhost_origins}")

        if problems:
            raise UnsafeProductionConfig(
                "Refusing to start with APP_ENV=production:\n"
                + "\n".join(f"  - {p}" for p in problems)
                + "\n\nFix the environment, or set APP_ENV=demo to run the exhibition build."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
