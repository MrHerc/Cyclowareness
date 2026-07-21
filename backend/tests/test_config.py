"""The production guard — Day 1 safety rails.

These assert the *refusal* behaviour directly, constructing Settings in
isolation rather than relying on the process environment, so they hold no
matter how the suite is invoked.
"""
import pytest

from app.config import DEFAULT_SECRET_KEY, Settings, UnsafeProductionConfig

SAFE = dict(
    app_env="production",
    secret_key="x" * 48,
    database_url="postgresql+psycopg://u:p@db:5432/cyclo",
    cors_origins="https://app.customer.com",
)


def _settings(**overrides) -> Settings:
    # _env_file=None so a developer's local .env can't influence the result.
    return Settings(_env_file=None, **{**SAFE, **overrides})


def test_safe_production_config_boots():
    s = _settings()
    assert s.app_env == "production"
    assert not s.is_demo


def test_production_rejects_default_secret_key():
    with pytest.raises(UnsafeProductionConfig, match="placeholder published"):
        _settings(secret_key=DEFAULT_SECRET_KEY)


def test_production_rejects_the_env_example_placeholder():
    """Length is not safety — the shipped example is 33 chars and public."""
    with pytest.raises(UnsafeProductionConfig, match="placeholder published"):
        _settings(secret_key="change-me-to-a-long-random-string")


def test_production_accepts_a_real_generated_secret():
    import secrets

    s = _settings(secret_key=secrets.token_urlsafe(48))
    assert s.app_env == "production"


def test_production_rejects_short_secret_key():
    with pytest.raises(UnsafeProductionConfig, match="shorter than"):
        _settings(secret_key="tooshort")


def test_production_rejects_sqlite():
    with pytest.raises(UnsafeProductionConfig, match="SQLite"):
        _settings(database_url="sqlite:///./cyclowareness.db")


def test_production_rejects_localhost_cors():
    with pytest.raises(UnsafeProductionConfig, match="localhost"):
        _settings(cors_origins="https://app.customer.com,http://localhost:5173")


def test_production_reports_every_problem_at_once():
    """One boot should surface the whole list, not fail one item at a time."""
    with pytest.raises(UnsafeProductionConfig) as exc:
        _settings(
            secret_key=DEFAULT_SECRET_KEY,
            database_url="sqlite:///./x.db",
            cors_origins="http://localhost:5173",
        )
    message = str(exc.value)
    assert "placeholder published" in message
    assert "SQLite" in message
    assert "localhost" in message


def test_demo_env_permits_demo_grade_config():
    """The exhibition build must still run on SQLite with the dev defaults."""
    s = Settings(
        _env_file=None,
        app_env="demo",
        secret_key=DEFAULT_SECRET_KEY,
        database_url="sqlite:///./cyclowareness.db",
        cors_origins="http://localhost:5173",
    )
    assert s.is_demo


def test_stage_delays_are_demo_only():
    """A customer must never pay for the artificial pacing that sells the demo."""
    demo = Settings(_env_file=None, app_env="demo", stage_delay_analyze=5.0)
    assert demo.delay_analyze == 5.0

    prod = _settings(stage_delay_analyze=5.0, stage_delay_convert=6.0, stage_delay_target=3.0)
    assert prod.delay_analyze == 0.0
    assert prod.delay_convert == 0.0
    assert prod.delay_target == 0.0
