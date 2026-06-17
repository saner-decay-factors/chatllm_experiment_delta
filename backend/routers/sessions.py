from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.config import OPENROUTER_MODEL_DEFAULT
from backend.database import get_db
from backend.models import ChatMessage, ChatSession
from backend.schemas.session import SessionIn, SessionListOut, SessionOut
from backend.services.openrouter import generate_reply


router = APIRouter()


_TITLE_PROMPT = (
    "Gere um título curto (máximo 6 palavras) em português para uma conversa "
    "que começa com esta mensagem. Responda apenas com o título, sem aspas ou pontuação extra."
)


async def _generate_title(*, user_message: str, model: str | None = None) -> str:
    """Generate a short title using the LLM based on the first user message."""
    try:
        reply, _ = await generate_reply(
            user_message=f"Mensagem: \"{user_message[:500]}\"\n\n{_TITLE_PROMPT}",
            history=[],
            model=model,
        )
        title = reply.strip().strip('"').strip("'")
        if title and len(title) <= 80:
            return title
    except Exception:
        pass
    return "Nova conversa"


@router.get("/api/sessions", response_model=SessionListOut)
def list_sessions(db: Session = Depends(get_db)) -> SessionListOut:
    sessions = (
        db.query(ChatSession)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )
    return SessionListOut(sessions=[
        SessionOut(id=s.id, title=s.title, created_at=s.created_at, updated_at=s.updated_at)
        for s in sessions
    ])


@router.post("/api/sessions", response_model=SessionOut, status_code=201)
def create_session(payload: SessionIn, db: Session = Depends(get_db)) -> SessionOut:
    session = ChatSession(title=payload.title or "Nova conversa")
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/api/sessions/{session_id}", response_model=SessionOut)
def get_session(session_id: int, db: Session = Depends(get_db)) -> SessionOut:
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    return session


@router.put("/api/sessions/{session_id}", response_model=SessionOut)
def update_session(session_id: int, payload: SessionIn, db: Session = Depends(get_db)) -> SessionOut:
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    if payload.title is not None:
        session.title = payload.title
    db.commit()
    db.refresh(session)
    return session


@router.delete("/api/sessions/{session_id}", status_code=200)
def delete_session(session_id: int, db: Session = Depends(get_db)) -> dict[str, str]:
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    db.query(ChatMessage).filter(ChatMessage.session_key == str(session_id)).delete()
    db.delete(session)
    db.commit()
    return {"status": "deleted"}


@router.get("/api/sessions/{session_id}/messages")
def get_session_messages(session_id: int, db: Session = Depends(get_db)) -> list[dict]:
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_key == str(session_id))
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return [
        {"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at.isoformat()}
        for m in messages
    ]