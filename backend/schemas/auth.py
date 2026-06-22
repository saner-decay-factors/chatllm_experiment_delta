from __future__ import annotations

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: str = Field(min_length=4, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=4, max_length=128)


class UserOut(BaseModel):
    id: int
    email: str

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    user: UserOut
    message: str = "OK"