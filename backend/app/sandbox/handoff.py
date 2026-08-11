"""Sign the analyst into the standalone Cyclowareness Sandbox, once.

The standalone is a separate product: its own database, its own chain of
custody, its own interface. This portal does not re-implement it and does not
proxy it — it LINKS to it, and the only work done here is sparing the analyst a
second password.

WHY THE PORTAL SIGNS ITS OWN TOKEN INSTEAD OF LOGGING IN AS A SERVICE ACCOUNT.
The simpler bridge is for the portal to hold one set of standalone credentials
and call its `/api/auth/login`. It works, it needs no shared secret, and it
writes the same subject — `analyst` — into the standalone's chain of custody for
every action any of this portal's users take. That chain is the thing the
standalone is sold on; a hand-off that erases who did what is a hand-off that
breaks the product it is connecting to. So the token is minted here with the
real person's address in it.

THE FORMAT IS THE STANDALONE'S, MIRRORED DELIBERATELY. It is a compact
HMAC-SHA256 blob — `base64url(json).base64url(mac)` — defined in the standalone's
`app/auth.py::issue_token`. Mirroring a wire format is a copy, and a copy drifts,
so `tests/test_sandbox_app_handoff.py` mints a token here and hands it to the
STANDALONE'S OWN verifier. If the two ever disagree, that test says so rather
than an analyst discovering it as a 401.

Claims, and why each is what it is:

    sub   the portal user's email — attribution, see above
    exp   short: this is a hand-off, not a session the portal manages
    tnt   the standalone's tenant; its reads filter on it
    epc   0 — the standalone's per-subject revocation epoch. A subject the
          standalone has never seen is at 0, and these subjects are portal
          addresses it has not issued tokens for. If somebody signs out inside
          the standalone the epoch there moves ahead of this and the hand-off
          stops working for them, which is the correct answer to "I signed out".
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time


class HandoffUnavailable(RuntimeError):
    """No shared secret is configured, so there is no link to offer."""


def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64d(txt: str) -> bytes:
    return base64.urlsafe_b64decode(txt + "=" * (-len(txt) % 4))


def mint(
    subject: str,
    *,
    secret: str,
    ttl_minutes: int,
    tenant: str = "default",
) -> tuple[str, int]:
    """Return `(token, expires_at)` the standalone will accept for `subject`.

    Raises `HandoffUnavailable` when no secret is configured — the caller must
    then not offer the link at all. Falling back to a shared identity here is
    exactly the failure this module exists to avoid, so it is not an option the
    signature allows.
    """
    if not secret:
        raise HandoffUnavailable(
            "SANDBOX_APP_SECRET is not set; the sandbox hand-off is closed. "
            "Set it to the standalone deployment's own SECRET_KEY."
        )
    expires = int(time.time()) + ttl_minutes * 60
    # `separators` matters: the signature covers these exact bytes, and a space
    # after a comma is a different message.
    body = json.dumps(
        {"sub": subject, "exp": expires, "tnt": tenant, "epc": 0},
        separators=(",", ":"),
    ).encode("utf-8")
    mac = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).digest()
    return f"{_b64e(body)}.{_b64e(mac)}", expires


def read_claims(token: str) -> dict:
    """The claims, WITHOUT verifying the signature. For tests and logging only."""
    body, _, _sig = token.partition(".")
    return json.loads(_b64d(body))
