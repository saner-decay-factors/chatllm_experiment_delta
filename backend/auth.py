from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session as SQLSession

from backend.config import JWT_ALGORITHM, JWT_EXPIRATION_HOURS, JWT_SECRET
from backend.database import get_db
from backend.models import User

security = HTTPBearer(auto_error=False)

# At least 1 uppercase and 1 digit
PASSWORD_RE = re.compile(r"^(?=.*[A-Z])(?=.*\d).+$")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def validate_password(password: str) -> str | None:
    """Return an error message if password is invalid, or None."""
    if len(password) < 8:
        return "A senha deve ter pelo menos 8 caracteres"
    if not PASSWORD_RE.match(password):
        return "A senha deve conter pelo menos 1 letra maiuscula e 1 numero"
    return None


def create_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: SQLSession = Depends(get_db),
) -> User | None:
    """Return the current authenticated user, or None if no token provided."""
    if credentials is None:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload.get("sub", "0"))
        if user_id == 0:
            return None
        user = db.query(User).filter(User.id == user_id).first()
        return user
    except (JWTError, ValueError, TypeError):
        return None


def require_user(
    current_user: User | None = Depends(get_current_user),
) -> User:
    """Require an authenticated user, or raise 401."""
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticacao necessaria",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user