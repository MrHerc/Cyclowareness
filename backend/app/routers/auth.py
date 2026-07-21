import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import LoginRequest, TokenResponse
from ..security import create_access_token, get_current_user, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Simple in-memory brute-force throttle: 10 failed attempts / 5 min per key.
_FAILED: dict[str, deque[float]] = defaultdict(deque)
_WINDOW_SECONDS = 300
_MAX_FAILURES = 10
# Sweep expired keys once the tracker gets large, so it cannot grow unbounded.
_PRUNE_AFTER_KEYS = 1000


def _throttle_key(request: Request | None, email: str) -> str:
    host = request.client.host if request and request.client else "?"
    return f"{host}:{email.lower()}"


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


def _throttle(key: str) -> None:
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
    if len(attempts) >= _MAX_FAILURES:
        raise HTTPException(status_code=429, detail="Too many failed attempts — try again later")


def _record_failure(key: str) -> None:
    _FAILED[key].append(time.monotonic())


def _authenticate(db: Session, email: str, password: str, key: str) -> User:
    """Shared credential check — every login route must funnel through here.

    Throttling lives here rather than in the route so a second entry point
    cannot silently bypass it (the OAuth2 form route previously did).
    """
    _throttle(key)
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user is None or not verify_password(password, user.hashed_password):
        _record_failure(key)
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
        db, payload.email, payload.password, _throttle_key(request, payload.email)
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
    user = _authenticate(db, form.username, form.password, _throttle_key(request, form.username))
    return _token_response(user)


@router.get("/me", response_model=TokenResponse)
def me(user: User = Depends(get_current_user)):
    return _token_response(user)
