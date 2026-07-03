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


def _throttle(key: str) -> None:
    now = time.monotonic()
    attempts = _FAILED[key]
    while attempts and now - attempts[0] > _WINDOW_SECONDS:
        attempts.popleft()
    if len(attempts) >= _MAX_FAILURES:
        raise HTTPException(status_code=429, detail="Too many failed attempts — try again later")


def _record_failure(key: str) -> None:
    _FAILED[key].append(time.monotonic())


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
    key = f"{request.client.host if request.client else '?'}:{payload.email.lower()}"
    _throttle(key)
    user = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.hashed_password):
        _record_failure(key)
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return _token_response(user)


@router.post("/login/form", response_model=TokenResponse, include_in_schema=False)
def login_form(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2 form login (used by the interactive API docs)."""
    user = db.execute(select(User).where(User.email == form.username)).scalar_one_or_none()
    if user is None or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return _token_response(user)


@router.get("/me", response_model=TokenResponse)
def me(user: User = Depends(get_current_user)):
    return _token_response(user)
