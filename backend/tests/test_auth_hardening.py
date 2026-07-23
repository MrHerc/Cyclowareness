"""Login-surface hardening."""
from fastapi.testclient import TestClient

from app.routers import auth as auth_router


def _reset_throttle():
    auth_router._FAILED.clear()


def test_password_spraying_across_accounts_is_throttled(client: TestClient):
    """Regression: the throttle keyed on (IP, account).

    One password tried once against every mailbox never reached 10 failures on
    any single key, so a spray across the whole company from one address ran to
    completion without ever tripping the limit. The per-IP counter closes it.
    """
    _reset_throttle()
    try:
        blocked_at = None
        for i in range(auth_router._MAX_FAILURES_PER_IP + 5):
            r = client.post(
                "/api/auth/login",
                json={"email": f"victim{i}@caspiandynamics.az", "password": "Autumn2026!"},
            )
            if r.status_code == 429:
                blocked_at = i
                break
            assert r.status_code == 401, r.text

        assert blocked_at is not None, "a spray across distinct accounts was never throttled"
        assert blocked_at <= auth_router._MAX_FAILURES_PER_IP + 1
    finally:
        _reset_throttle()


def test_a_single_account_is_still_throttled_sooner(client: TestClient):
    """The per-account cap stays tighter than the per-IP one."""
    _reset_throttle()
    try:
        blocked_at = None
        for i in range(auth_router._MAX_FAILURES + 3):
            r = client.post(
                "/api/auth/login",
                json={"email": "analyst@caspiandynamics.az", "password": "wrong"},
            )
            if r.status_code == 429:
                blocked_at = i
                break
        assert blocked_at is not None
        assert blocked_at <= auth_router._MAX_FAILURES + 1
        assert auth_router._MAX_FAILURES < auth_router._MAX_FAILURES_PER_IP
    finally:
        _reset_throttle()


def test_identity_endpoint_does_not_mint_a_token(client: TestClient, analyst_headers):
    """Regression: /auth/me answered with a TokenResponse, so it issued a fresh
    12-hour credential on every call — a stolen token could be renewed forever
    by pinging an endpoint whose only job is to report a name."""
    r = client.get("/api/auth/me", headers=analyst_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "access_token" not in body
    assert body["role"] == "analyst"
    assert body["email"] == "analyst@caspiandynamics.az"
