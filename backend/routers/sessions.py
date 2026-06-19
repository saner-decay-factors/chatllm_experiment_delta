from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from backend.database import get_db
from backend.models import ChatMessage
from backend.models import Session as ChatSession
from backend.services.openrouter import generate_reply

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("")
def list_sessions(db: DBSession = Depends(get_db)):
    """List all sessions, ordered by most recently updated."""
    sessions = (
        db.query(ChatSession)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )
    return [
        {
            "id": s.id,
            "title": s.title,
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat(),
            "message_count": len(s.messages),
        }
        for s in sessions
    ]


@router.post("")
def create_session(db: DBSession = Depends(get_db)):
    """Create a new session."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    session = ChatSession(title="Nova conversa", created_at=now, updated_at=now)
    db.add(session)
    db.commit()
    db.refresh(session)
    return {
        "id": session.id,
        "title": session.title,
        "created_at": session.created_at.isoformat(),
        "updated_at": session.updated_at.isoformat(),
        "message_count": 0,
    }


@router.get("/{session_id}")
def get_session(session_id: int, db: DBSession = Depends(get_db)):
    """Get a session with its messages."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessao nao encontrada")
    return {
        "id": session.id,
        "title": session.title,
        "created_at": session.created_at.isoformat(),
        "updated_at": session.updated_at.isoformat(),
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "model": m.model,
                "created_at": m.created_at.isoformat(),
            }
            for m in session.messages
        ],
    }


@router.put("/{session_id}/title")
def update_session_title(session_id: int, payload: dict, db: DBSession = Depends(get_db)):
    """Update a session's title."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessao nao encontrada")
    title = payload.get("title", "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Titulo nao pode estar vazio")
    session.title = title
    session.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return {"id": session.id, "title": session.title}


@router.delete("/{session_id}")
def delete_session(session_id: int, db: DBSession = Depends(get_db)):
    """Delete a session and all its messages."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessao nao encontrada")
    db.delete(session)
    db.commit()
    return {"ok": True}