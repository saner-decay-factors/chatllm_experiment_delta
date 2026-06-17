from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class SessionIn(BaseModel):
    title: str | None = None


class SessionOut(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime


class SessionListOut(BaseModel):
    sessions: list[SessionOut]