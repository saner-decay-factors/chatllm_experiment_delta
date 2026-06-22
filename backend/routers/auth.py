from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from backend.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_HOURS
from backend.database import get_db
from backend.models import User
from backend.schemas.auth import RegisterRequest, LoginRequest, AuthResponse, UserOut


router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_NAME = "chatllm_token"


def _hash_password(password: str) -> str:
    import bcrypt as _bcrypt
    return _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, password_hash: str) -> bool:
    import bcrypt as _bcrypt
    return _bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def _create_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "exp": int((now + timedelta(hours=JWT_EXPIRE_HOURS)).timestamp()),
        "iat": int(now.timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    """Retorna o usuario autenticado ou None."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload.get("sub"))
        user = db.query(User).filter(User.id == user_id).first()
        return user
    except (JWTError, ValueError, TypeError):
        return None


def require_user(user: User | None = Depends(get_current_user)) -> User:
    """Retorna o usuario ou levanta 401."""
    if user is None:
        raise HTTPException(status_code=401, detail="Autenticacao necessaria.")
    return user


@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db), response: Response = None):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email ja cadastrado.")

    user = User(
        email=payload.email,
        password_hash=_hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = _create_token(user.id)
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=JWT_EXPIRE_HOURS * 3600,
        path="/",
    )

    return AuthResponse(user=UserOut.model_validate(user), message="Cadastro realizado com sucesso.")


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db), response: Response = None):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not _verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos.")

    token = _create_token(user.id)
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=JWT_EXPIRE_HOURS * 3600,
        path="/",
    )

    return AuthResponse(user=UserOut.model_validate(user), message="Login realizado com sucesso.")


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"message": "Logout realizado com sucesso."}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(require_user)):
    return UserOut.model_validate(user)