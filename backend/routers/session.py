from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as SQLSession

from backend.auth import get_current_user, require_user
from backend.database import get_db
from backend.models import ChatMessage, Session, User
from backend.schemas.session import SessionCreate, SessionMessageOut, SessionOut

router = APIRouter()


def _user_sessions_query(db: SQLSession, user: User | None):
    """Base query filtered by user if authenticated, otherwise returns all."""
    q = db.query(Session)
    if user is not None:
        q = q.filter(Session.user_id == user.id)
    return q


@router.get("/api/sessions", response_model=list[SessionOut])
def list_sessions(
    db: SQLSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
) -> list[Session]:
    return (
        _user_sessions_query(db, current_user)
        .order_by(Session.updated_at.desc())
        .all()
    )


@router.post("/api/sessions", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreate,
    db: SQLSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
) -> Session:
    session = Session(user_id=current_user.id if current_user else None)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/api/sessions/{session_id}", response_model=SessionOut)
def get_session(
    session_id: int,
    db: SQLSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
) -> Session:
    q = _user_sessions_query(db, current_user).filter(Session.id == session_id)
    session = q.first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessao nao encontrada")
    return session


@router.delete("/api/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_session(
    session_id: int,
    db: SQLSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
) -> None:
    q = _user_sessions_query(db, current_user).filter(Session.id == session_id)
    session = q.first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessao nao encontrada")
    db.delete(session)
    db.commit()


@router.get("/api/sessions/{session_id}/messages", response_model=list[SessionMessageOut])
def list_session_messages(
    session_id: int,
    db: SQLSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
) -> list[ChatMessage]:
    q = _user_sessions_query(db, current_user).filter(Session.id == session_id)
    session = q.first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessao nao encontrada")
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )