"""The hand-off to the standalone Cyclowareness Sandbox.

The portal does not re-implement the standalone; it links to it and spares the
analyst a second password. That means minting a token in the standalone's own
format — and the only test worth having is whether the standalone ACTUALLY
ACCEPTS IT. Both repositories are on this machine during development, so the
verification below runs the standalone's real verifier, in its own process,
rather than a copy of what it is believed to do. A test that checks our encoder
against our own decoder proves the two agree with each other and nothing about
the product they are for.

Skipped when the standalone is not checked out, for the same reason as
`test_engine_seam_holds` — with the same relative lookup, so it is not a check
that only runs in one home directory.
"""
from __future__ import annotations

import json
import os
import pathlib
import subprocess
import sys
import textwrap

import pytest

from app.sandbox import handoff

_REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
_CANDIDATES = (
    _REPO_ROOT.parent / "cyclowareness-sandbox" / "backend",
    _REPO_ROOT / "cyclowareness-sandbox" / "backend",
)


def _find_standalone() -> pathlib.Path | None:
    override = os.environ.get("CYCLOWARENESS_SANDBOX_BACKEND")
    if override:
        path = pathlib.Path(override)
        return path if path.is_dir() else None
    return next((p for p in _CANDIDATES if (p / "app" / "auth.py").is_file()), None)


_STANDALONE = _find_standalone()
SECRET = "a-shared-signing-key-at-least-32-bytes-long!!"


def _standalone_verifies(token: str, secret: str) -> dict:
    """Ask the standalone — in its own process — what it makes of this token.

    IN A SUBPROCESS, not by importing. Both repositories name their package
    `app`, so putting the standalone's backend on `sys.path` and importing
    `app.auth` either shadows this portal's own `app` or resolves its relative
    imports against the wrong one. Isolation is not fastidiousness here; it is
    the only way the answer comes from the other product rather than from a
    hybrid of the two.

    Returns `{"ok": bool, "subject": str|None, "method": str|None}`.
    """
    backend = _STANDALONE
    assert backend is not None
    script = textwrap.dedent(
        """
        import json, os, sys
        sys.path.insert(0, sys.argv[1])
        os.environ["APP_ENV"] = "demo"
        os.environ["SECRET_KEY"] = sys.argv[3]
        from app.auth import _verify_token
        from app.config import get_settings
        identity = _verify_token(sys.argv[2], get_settings())
        print(json.dumps(
            {"ok": identity is not None,
             "subject": getattr(identity, "subject", None),
             "method": getattr(identity, "method", None)}
        ))
        """
    )
    result = subprocess.run(
        [sys.executable, "-c", script, str(backend), token, secret],
        capture_output=True,
        text=True,
        timeout=90,
    )
    if result.returncode != 0:
        pytest.skip(f"could not run the standalone's verifier: {result.stderr.strip()[:200]}")
    return json.loads(result.stdout.strip().splitlines()[-1])


def test_the_token_carries_the_person_not_a_service_account():
    """Attribution is the reason the hand-off signs its own token.

    Calling the standalone's login with one shared credential would be simpler
    and would write "analyst" into its chain of custody for every action any of
    26 portal users took. The subject is the real address.
    """
    token, expires = handoff.mint("rashad.mammadov@caspiandynamics.az", secret=SECRET, ttl_minutes=30)
    claims = handoff.read_claims(token)
    assert claims["sub"] == "rashad.mammadov@caspiandynamics.az"
    assert claims["exp"] == expires
    assert claims["epc"] == 0


def test_an_unconfigured_handoff_is_closed_rather_than_shared():
    """No secret means no link — never a fallback to one shared identity."""
    with pytest.raises(handoff.HandoffUnavailable):
        handoff.mint("someone@example.com", secret="", ttl_minutes=30)


@pytest.mark.skipif(
    _STANDALONE is None,
    reason=(
        "the standalone checkout is not on this machine — CI runs one repository "
        "at a time. Point CYCLOWARENESS_SANDBOX_BACKEND at <sandbox>/backend to run it."
    ),
)
def test_the_standalone_accepts_a_token_the_portal_minted():
    """The whole point, verified against the other product's real code."""
    token, _ = handoff.mint("analyst@caspiandynamics.az", secret=SECRET, ttl_minutes=30)
    verdict = _standalone_verifies(token, SECRET)

    assert verdict["ok"], "the standalone rejected a token the portal minted"
    assert verdict["subject"] == "analyst@caspiandynamics.az"
    # `require_admin` on the standalone demands an interactive session rather
    # than an API key, so the hand-off has to land on the session path or the
    # analyst arrives unable to reach tuning and retention.
    assert verdict["method"] == "session"


@pytest.mark.skipif(_STANDALONE is None, reason="the standalone checkout is not on this machine")
def test_a_token_signed_with_the_wrong_key_is_refused():
    """The guard that makes the shared secret meaningful."""
    token, _ = handoff.mint("analyst@caspiandynamics.az", secret="a-different-key-entirely-xxxxxxx", ttl_minutes=30)
    assert _standalone_verifies(token, SECRET)["ok"] is False


# --- is there a door, and does the UI know before it draws one? ---------------
#
# The hand-off endpoint answers "mint me a session" and 404s when there is no
# standalone. That is the right shape for the ACTION, and the wrong shape for
# the QUESTION — a button in the top bar cannot discover its own existence by
# being clicked. Drawn optimistically it is a door to nowhere on every
# deployment without a standalone; drawn after a probe it appears a beat late,
# in the row of controls the eye scans first. So the startup capability answer
# carries it, alongside `demo_mode`, and the button is either there from the
# first paint or never.


def test_capabilities_admits_a_standalone_when_one_is_configured(client, analyst_headers, monkeypatch):
    from app.main import settings as live

    monkeypatch.setattr(live, "sandbox_app_url", "http://sandbox.internal")
    monkeypatch.setattr(live, "sandbox_app_secret", SECRET)

    assert client.get("/api/capabilities", headers=analyst_headers).json()["sandbox_app"] is True


def test_capabilities_denies_a_standalone_that_is_only_half_configured(client, analyst_headers, monkeypatch):
    """A URL with no shared secret mints nothing — `mint` raises rather than
    falling back to a shared identity. Advertising the door in that state buys
    the analyst a 503 instead of a sandbox, so it stays shut."""
    from app.main import settings as live

    monkeypatch.setattr(live, "sandbox_app_url", "http://sandbox.internal")
    monkeypatch.setattr(live, "sandbox_app_secret", "")

    assert client.get("/api/capabilities", headers=analyst_headers).json()["sandbox_app"] is False


def test_the_shared_secret_never_reaches_the_capability_response(client, analyst_headers, monkeypatch):
    """The canary. `sandbox_app` is a boolean about a signing key, and the one
    way to get this wrong is to publish the key it is about."""
    from app.main import settings as live

    monkeypatch.setattr(live, "sandbox_app_url", "http://sandbox.internal")
    monkeypatch.setattr(live, "sandbox_app_secret", SECRET)

    assert SECRET not in client.get("/api/capabilities", headers=analyst_headers).text
