import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import IdentityResponse, LoginRequest, TokenResponse
from ..security import create_access_token, get_current_user, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Simple in-memory brute-force throttle, on two keys at once.
#
# Per (IP, account) catches someone grinding passwords against one mailbox.
# It does NOT catch the opposite and more common attack: one likely password
# tried once against every account. Spraying 500 accounts from one address
# never reached 10 failures on any single key, so the throttle stayed silent
# through the whole run. The per-IP counter is what closes that.
_FAILED: dict[str, deque[float]] = defaultdict(deque)
_WINDOW_SECONDS = 300
_MAX_FAILURES = 10
# Deliberately looser than the per-account cap: a shared office NAT is a lot of
# legitimate people behind one address, and this must not lock out a floor.
_MAX_FAILURES_PER_IP = 30
# Sweep expired keys once the tracker gets large, so it cannot grow unbounded.
_PRUNE_AFTER_KEYS = 1000


def _client_host(request: Request | None) -> str:
    return request.client.host if request and request.client else "?"


def _throttle_keys(request: Request | None, email: str) -> tuple[str, str]:
    """Both keys a failed attempt counts against: the account, and the source."""
    host = _client_host(request)
    return f"{host}:{email.lower()}", f"ip:{host}"


def _prune(now: float) -> None:
    """Drop keys whose whole window has expired.

    Without this the tracker is an unbounded dict: every distinct
    (IP, email) pair that ever failed keeps an entry for the process's
    lifetime, which credential-stuffing across many addresses turns into a
    slow memory leak.
    """
    stale = [
        key
        for key, attempts in _FAILED.items()
        if not attempts or now - attempts[-1] > _WINDOW_SECONDS
    ]
    for key in stale:
        del _FAILED[key]


def _throttle(key: str, cap: int) -> None:
    now = time.monotonic()
    if len(_FAILED) > _PRUNE_AFTER_KEYS:
        _prune(now)
    attempts = _FAILED[key]
    while attempts and now - attempts[0] > _WINDOW_SECONDS:
        attempts.popleft()
    if not attempts:
        # Never leave an empty deque behind — that is how the dict grew
        # on successful logins too.
        _FAILED.pop(key, None)
    if len(attempts) >= cap:
        raise HTTPException(status_code=429, detail="Too many failed attempts — try again later")


def _record_failure(*keys: str) -> None:
    now = time.monotonic()
    for key in keys:
        _FAILED[key].append(now)


def _authenticate(db: Session, email: str, password: str, keys: tuple[str, str]) -> User:
    """Shared credential check — every login route must funnel through here.

    Throttling lives here rather than in the route so a second entry point
    cannot silently bypass it (the OAuth2 form route previously did).
    """
    account_key, ip_key = keys
    _throttle(account_key, _MAX_FAILURES)
    _throttle(ip_key, _MAX_FAILURES_PER_IP)
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user is None or not verify_password(password, user.hashed_password):
        _record_failure(account_key, ip_key)
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return user


def _token_response(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user),
        role=user.role,
        email=user.email,
        employee_id=user.employee_id,
        employee_name=user.employee.name if user.employee else None,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = _authenticate(
        db, payload.email, payload.password, _throttle_keys(request, payload.email)
    )
    return _token_response(user)


@router.post("/login/form", response_model=TokenResponse, include_in_schema=False)
def login_form(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """OAuth2 form login (used by the interactive API docs).

    Hidden from the schema but fully routable — it must be throttled exactly
    like /login, or it is a free bypass of the rate limit.
    """
    user = _authenticate(db, form.username, form.password, _throttle_keys(request, form.username))
    return _token_response(user)


@router.get("/me", response_model=IdentityResponse)
def me(user: User = Depends(get_current_user)):
    """Identity only. This endpoint deliberately does not mint a token."""
    return IdentityResponse(
        role=user.role,
        email=user.email,
        employee_id=user.employee_id,
        employee_name=user.employee.name if user.employee else None,
    )


# --- Phone-entry portals -----------------------------------------------------
#
# Two fixed numbers, from settings: the admin number opens the ADMIN portal
# behind an OTP step, the user number opens the employee portal directly. This
# is an entry-point split, not a parallel identity system — a successful phone
# entry resolves to one of the SAME seeded users and issues the same token the
# password form would, so every permission check downstream is unchanged.
#
# THE OTP IS A STUB AND SAYS SO. No SMS gateway is wired, so in demo mode the
# code is generated server-side and RETURNED IN THE RESPONSE, labelled demo_otp,
# and the UI shows it to the operator to type back. That exercises the real flow
# shape — start, code, verify, expiry, single use — while being incapable of
# pretending a message was sent. When a gateway exists, the field disappears and
# the send happens here instead.

import secrets as _secrets

from pydantic import BaseModel as _BaseModel

from ..config import get_settings as _get_settings

#: phone -> (code, expires_at_epoch). In-memory on purpose: a restart voids
#: outstanding codes, which for a login stub is the safe direction.
_pending_otp: dict[str, tuple[str, float]] = {}
_OTP_TTL_SECONDS = 300


class PhoneStartRequest(_BaseModel):
    phone: str


class PhoneStartResponse(_BaseModel):
    portal: str  # "admin" | "user"
    otp_required: bool
    #: Demo only — the code that would have been texted. Absent in production.
    demo_otp: str | None = None


class PhoneVerifyRequest(_BaseModel):
    phone: str
    code: str


def _normalise_phone(raw: str) -> str:
    return "".join(ch for ch in raw if ch.isdigit())


def _analyst_user(db: Session) -> User:
    user = db.scalar(select(User).where(User.role == "analyst"))
    if user is None:
        raise HTTPException(status_code=503, detail="No analyst account is seeded")
    return user


def _employee_user(db: Session) -> User:
    user = db.scalar(
        select(User).where(User.role == "employee", User.employee_id.is_not(None))
    )
    if user is None:
        raise HTTPException(status_code=503, detail="No employee account is seeded")
    return user


@router.post("/phone/start", response_model=PhoneStartResponse)
def phone_start(payload: PhoneStartRequest, request: Request, db: Session = Depends(get_db)):
    """Which portal does this number open, and does it need a code?

    The unknown-number answer is a 404 with no hint of which numbers exist —
    this endpoint must not be an oracle for enumerating them.
    """
    settings = _get_settings()
    phone = _normalise_phone(payload.phone)
    _throttle(f"phone:{_client_host(request)}", 20)

    if phone == _normalise_phone(settings.admin_phone):
        code = f"{_secrets.randbelow(1_000_000):06d}"
        _pending_otp[phone] = (code, time.time() + _OTP_TTL_SECONDS)
        return PhoneStartResponse(
            portal="admin",
            otp_required=True,
            demo_otp=code if settings.app_env == "demo" else None,
        )

    if phone == _normalise_phone(settings.user_phone):
        # The employee number opens the portal directly — the owner asked for
        # the OTP step on the admin side only.
        return PhoneStartResponse(portal="user", otp_required=False)

    raise HTTPException(status_code=404, detail="This number is not registered")


@router.post("/phone/verify", response_model=TokenResponse)
def phone_verify(payload: PhoneVerifyRequest, request: Request, db: Session = Depends(get_db)):
    """Trade a phone (+ code, where required) for the same token the form issues."""
    settings = _get_settings()
    phone = _normalise_phone(payload.phone)
    _throttle(f"phone:{_client_host(request)}", 20)

    if phone == _normalise_phone(settings.user_phone):
        return _token_response(_employee_user(db))

    if phone == _normalise_phone(settings.admin_phone):
        pending = _pending_otp.get(phone)
        if pending is None or time.time() > pending[1]:
            _pending_otp.pop(phone, None)
            raise HTTPException(status_code=401, detail="Code expired — start again")
        if not _secrets.compare_digest(pending[0], payload.code.strip()):
            raise HTTPException(status_code=401, detail="Wrong code")
        # Single use: a code that verified once must not verify twice.
        _pending_otp.pop(phone, None)
        return _token_response(_analyst_user(db))

    raise HTTPException(status_code=404, detail="This number is not registered")
