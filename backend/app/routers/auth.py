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
