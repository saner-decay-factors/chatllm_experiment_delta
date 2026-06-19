from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as SQLSession

from backend.auth import (
    create_token,
    get_current_user,
    hash_password,
    require_user,
    validate_password,
    verify_password,
)
from backend.database import get_db
from backend.models import User
from backend.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserOut

router = APIRouter(tags=["auth"])


@router.post("/api/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: SQLSession = Depends(get_db)) -> AuthResponse:
    # Check duplicate email
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este email ja esta cadastrado",
        )

    # Validate password strength
    pwd_error = validate_password(payload.password)
    if pwd_error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=pwd_error)

    user = User(
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_token(user.id)
    return AuthResponse(
        token=token,
        user_id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
    )


@router.post("/api/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: SQLSession = Depends(get_db)) -> AuthResponse:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
        )

    token = create_token(user.id)
    return AuthResponse(
        token=token,
        user_id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
    )


@router.post("/api/auth/logout", status_code=status.HTTP_200_OK)
def logout(current_user: User = Depends(require_user)) -> dict[str, str]:
    # JWT is stateless — client must discard the token
    return {"message": "Logout realizado com sucesso"}


@router.get("/api/auth/me", response_model=UserOut)
def me(current_user: User = Depends(require_user)) -> User:
    return current_user