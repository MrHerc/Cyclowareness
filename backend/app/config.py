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

    #: The largest sample this deployment accepts, in megabytes. The engine's
    #: own default is 32 MB and the routers previously took it implicitly, so the
    #: ceiling could not be lowered for a constrained host or raised for a
    #: forensics one without editing vendored code.
    max_sample_mb: int = 32

    # Sandbox analyzer: "mock" | "real"
    sandbox_analyzer: str = "mock"
    real_analyzer_backend: str = "virustotal"  # virustotal | cape | hybrid_analysis
    real_analyzer_api_key: str = ""
    real_analyzer_url: str = ""

    # Task queue: "inprocess" | "celery"
    # --- phone-entry portals ------------------------------------------------
    # The two numbers the portal split keys on. Env-overridable because they are
    # personal data with defaults committed at the owner's explicit request —
    # a deployment for anyone else sets ADMIN_PHONE / USER_PHONE instead of
    # editing source.
    admin_phone: str = "0102210831"
    user_phone: str = "0557711253"

    task_runner: str = "inprocess"
    redis_url: str = "redis://localhost:6379/0"

    # Loop pacing — artificial latency so the loop visibly turns in the UI.
    # Demo-only: real sandbox/AI calls take seconds-to-minutes on their own, and
    # a customer should never pay for a sleep. Forced to 0 in production.
    stage_delay_analyze: float = 5.0
    stage_delay_convert: float = 6.0
    stage_delay_target: float = 3.0

    # Egress. `app/sandbox/sovereignty.py` is the choke point every outbound
    # call in the analysis path asks before making it, and its refusals are
    # counted and reported.
    #
    # THE DEFAULT DIFFERS FROM THE STANDALONE SANDBOX ON PURPOSE, and the
    # difference is a factual one, not a preference. The standalone defaults it
    # ON because it is an appliance whose whole promise is that files never leave
    # the building. This portal calls an LLM by design — the loop's CONVERT stage
    # is a model call — so a deployment with an API key set and this flag on would
    # print "no analysis data leaves this deployment" onto an incident record
    # handed to a regulator while posting to a third-party model API. Defaulting
    # it off states the truth; an operator who wants the guarantee sets
    # SOVEREIGN_MODE=true, and the AI provider then refuses rather than lying.
    sovereign_mode: bool = False
    #: The deliberate exception, separately controllable so an air-gapped
    #: deployment can close it too. Submitting a URL for analysis IS a request to
    #: fetch it, so the fetcher is not an exfiltration path.
    sovereign_allow_url_fetch: bool = True

    # The shared token an off-host detonation worker authenticates with. Empty
    # closes the dynamic seam entirely with a 503: accepting externally supplied
    # "behaviour" into a verdict is a trust decision the operator must make
    # deliberately, so it is opt-in rather than opt-out. This is the widest
    # credential in the system — it buys every sample's bytes and the ability to
    # fabricate behaviour for any job.
    dynamic_worker_token: str = ""

    # --- the standalone Cyclowareness Sandbox, reachable from this portal ----
    #
    # The standalone is a separate product with its own database, audit chain
    # and interface. It is not re-implemented here; it is LINKED, and the only
    # thing this portal does for it is spare the analyst a second password.
    #
    # `sandbox_app_secret` MUST equal the standalone's own `SECRET_KEY`. The
    # portal signs a session token in the standalone's format so the analyst
    # arrives already authenticated — and it signs it with the REAL person's
    # address in the subject claim, not a shared service account, because the
    # standalone's chain of custody is only worth having if it records who
    # actually did the thing.
    #
    # Left empty, the hand-off is closed and the portal simply does not offer
    # the link. That is the safe direction: a missing secret must not silently
    # degrade to "everyone shares one identity".
    #
    # NOTE FOR DEMO DEPLOYMENTS: the standalone generates a random signing key
    # per boot when `SECRET_KEY` is unset, so it must be given an explicit one
    # for this to work at all. A token signed with a key that was regenerated
    # two seconds ago verifies against nothing.
    sandbox_app_url: str = ""
    sandbox_app_secret: str = ""
    #: Must match the standalone's `ANALYST_TENANT` (empty there means "default").
    sandbox_app_tenant: str = "default"
    #: Short by design — it is a hand-off, not a session the portal manages.
    sandbox_app_ttl_minutes: int = 30

    # Report signing. A base64 or hex Ed25519 seed; empty means reports are
    # still exported in full but carry `"signed": false` and the reason, rather
    # than implying an assurance the deployment cannot give.
    signing_key: str = ""

    # Notifying entity (regulatory records).
    # A NIS2 Article 23 early warning and a DORA Article 19 notification both
    # identify the notifying entity. The sandbox engine cannot know who is
    # running it, so these are supplied here and copied verbatim into the
    # incident record; left empty, the record names them as operator input still
    # required rather than inventing an entity.
    entity_name: str = ""
    entity_country: str = ""
    entity_sector: str = ""
    entity_contact: str = ""

    # Who BUILT the platform, as distinct from `entity_name`, which is the
    # organisation RUNNING it and reporting incidents under NIS2/DORA. Mixing
    # the two would put the vendor's name on a regulatory notification the
    # customer files, so they stay separate settings with separate meanings.
    vendor_name: str = "Safarov Industries Inc."

    # Behaviour
    auto_approve_training: bool = False
    #: Seconds between GRC-watch scans of intel against active policy rules.
    #: <= 0 disables the background loop; the manual run endpoint still works.
    grc_watch_interval_seconds: int = 300
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
