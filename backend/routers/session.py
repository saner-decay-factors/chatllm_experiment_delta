from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as SQLSession

from backend.database import get_db
from backend.models import ChatMessage, Session
from backend.schemas.session import SessionCreate, SessionMessageOut, SessionOut

router = APIRouter()


@router.get("/api/sessions", response_model=list[SessionOut])
def list_sessions(db: SQLSession = Depends(get_db)) -> list[Session]:
    return (
        db.query(Session)
        .order_by(Session.updated_at.desc())
        .all()
    )


@router.post("/api/sessions", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def create_session(payload: SessionCreate, db: SQLSession = Depends(get_db)) -> Session:
    session = Session()
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/api/sessions/{session_id}", response_model=SessionOut)
def get_session(session_id: int, db: SQLSession = Depends(get_db)) -> Session:
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessao nao encontrada")
    return session


@router.delete("/api/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_session(session_id: int, db: SQLSession = Depends(get_db)) -> None:
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessao nao encontrada")
    db.delete(session)
    db.commit()


@router.get("/api/sessions/{session_id}/messages", response_model=list[SessionMessageOut])
def list_session_messages(session_id: int, db: SQLSession = Depends(get_db)) -> list[ChatMessage]:
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessao nao encontrada")
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )