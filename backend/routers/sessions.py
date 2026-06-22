from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import ChatMessage, ChatSession
from backend.schemas.chat import ChatMessageOut
from backend.schemas.session import SessionCreate, SessionOut, SessionUpdate


router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("", response_model=list[SessionOut])
def list_sessions(db: Session = Depends(get_db)):
    """Retorna todas as sessoes ordenadas pela mais recente."""
    sessions = (
        db.query(ChatSession)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )
    return sessions


@router.post("", response_model=SessionOut, status_code=201)
def create_session(payload: SessionCreate, db: Session = Depends(get_db)):
    """Cria uma nova sessao."""
    session = ChatSession(title=payload.title)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.put("/{session_id}", response_model=SessionOut)
def update_session(session_id: int, payload: SessionUpdate, db: Session = Depends(get_db)):
    """Atualiza o titulo de uma sessao."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessao nao encontrada")
    session.title = payload.title
    db.commit()
    db.refresh(session)
    return session


@router.delete("/{session_id}", status_code=204)
def delete_session(session_id: int, db: Session = Depends(get_db)):
    """Exclui uma sessao e todas as suas mensagens."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessao nao encontrada")
    db.delete(session)
    db.commit()


@router.get("/{session_id}/messages", response_model=list[ChatMessageOut])
def list_session_messages(session_id: int, db: Session = Depends(get_db)):
    """Retorna as mensagens de uma sessao ordenadas por criacao."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessao nao encontrada")
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return messages