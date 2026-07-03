"""Authentication & RBAC: JWT bearer tokens, three roles (spec §5)."""
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.hash import pbkdf2_sha256
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from .models import Role, User

settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pbkdf2_sha256.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pbkdf2_sha256.verify(plain, hashed)


def create_access_token(user: User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user.id), "role": user.role, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub", ""))
    except (jwt.PyJWTError, ValueError):
        raise credentials_error
    user = db.get(User, user_id)
    if user is None:
        raise credentials_error
    return user


def require_roles(*roles: str):
    """Dependency factory: restrict an endpoint to the given roles."""

    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return checker


require_analyst = require_roles(Role.ANALYST)
require_analyst_or_exec = require_roles(Role.ANALYST, Role.EXECUTIVE)
any_user = get_current_user
