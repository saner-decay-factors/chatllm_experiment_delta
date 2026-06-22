from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import ChatMessage, ChatSession, User
from backend.routers.auth import get_current_user
from backend.schemas.chat import ChatMessageOut
from backend.schemas.session import SessionCreate, SessionOut, SessionUpdate


router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def _get_user_sessions(db: Session, user: User | None):
    """Retorna query base para sessoes — filtra por user se autenticado."""
    query = db.query(ChatSession)
    if user:
        query = query.filter(ChatSession.user_id == user.id)
    return query


@router.get("", response_model=list[SessionOut])
def list_sessions(db: Session = Depends(get_db), user: User | None = Depends(get_current_user)):
    """Retorna todas as sessoes do usuario logado, ou todas se anonimo."""
    sessions = (
        _get_user_sessions(db, user)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )
    return sessions


@router.post("", response_model=SessionOut, status_code=201)
def create_session(payload: SessionCreate, db: Session = Depends(get_db), user: User | None = Depends(get_current_user)):
    """Cria uma nova sessao vinculada ao usuario logado."""
    session = ChatSession(title=payload.title, user_id=user.id if user else None)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.put("/{session_id}", response_model=SessionOut)
def update_session(session_id: int, payload: SessionUpdate, db: Session = Depends(get_db), user: User | None = Depends(get_current_user)):
    """Atualiza o titulo de uma sessao."""
    query = _get_user_sessions(db, user)
    session = query.filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessao nao encontrada")
    session.title = payload.title
    db.commit()
    db.refresh(session)
    return session


@router.delete("/{session_id}", status_code=204)
def delete_session(session_id: int, db: Session = Depends(get_db), user: User | None = Depends(get_current_user)):
    """Exclui uma sessao e todas as suas mensagens."""
    query = _get_user_sessions(db, user)
    session = query.filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessao nao encontrada")
    db.delete(session)
    db.commit()


@router.get("/{session_id}/messages", response_model=list[ChatMessageOut])
def list_session_messages(session_id: int, db: Session = Depends(get_db), user: User | None = Depends(get_current_user)):
    """Retorna as mensagens de uma sessao."""
    query = _get_user_sessions(db, user)
    session = query.filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessao nao encontrada")
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return messages