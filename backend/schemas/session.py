from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    title: str | None = None


class SessionUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class SessionOut(BaseModel):
    id: int
    title: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}