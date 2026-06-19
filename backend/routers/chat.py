from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.config import OPENROUTER_MODEL_DEFAULT
from backend.database import get_db
from backend.models import ChatMessage, Session as ChatSession
from backend.schemas.chat import ChatRequest, ChatResponse
from backend.services.openrouter import OpenRouterConfigError, generate_reply, stream_reply


router = APIRouter()


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


def _resolve_session(payload: ChatRequest, db: Session) -> ChatSession:
    """Return existing session or create a new one with auto-title from the user message."""
    if payload.session_id is not None:
        session = db.query(ChatSession).filter(ChatSession.id == payload.session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Sessao nao encontrada")
        # Set title if session is still untitled
        if not session.title:
            session.title = _auto_title(payload.message)
            db.commit()
        return session
    # Create a new session with auto-title from the user's message
    session = ChatSession(title=_auto_title(payload.message))
    db.add(session)
    db.commit()
    db.refresh(session)
    payload.session_id = session.id
    return session


def _auto_title(user_message: str) -> str:
    """Generate a short title from the user's first message."""
    cleaned = user_message.strip()
    if not cleaned:
        return "Nova sessao"
    # Take first line or first 60 chars, whichever is shorter
    first_line = cleaned.split("\n")[0]
    title = first_line[:60]
    if len(title) < len(cleaned):
        title += "..."
    return title


def _persist_messages(
    db: Session,
    session_id: int,
    user_message: str,
    reply: str,
    model: str,
) -> None:
    db.add(ChatMessage(session_id=session_id, role="user", content=user_message, model=model))
    db.add(ChatMessage(session_id=session_id, role="assistant", content=reply, model=model))

    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if session:
        if not session.title:
            session.title = _auto_title(user_message)
        session.updated_at = __import__("datetime").datetime.now(
            __import__("datetime").timezone.utc
        ).replace(tzinfo=None)
    db.commit()


@router.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    session = _resolve_session(payload, db)

    try:
        reply, model_name = await generate_reply(
            user_message=payload.message,
            history=[item.model_dump() for item in payload.history],
            model=payload.model,
        )
    except OpenRouterConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    resolved_model = payload.model or model_name or OPENROUTER_MODEL_DEFAULT
    _persist_messages(db, session.id, payload.message, reply, resolved_model)

    return ChatResponse(reply=reply, model=resolved_model)


@router.post("/api/chat/stream")
async def chat_stream(payload: ChatRequest, db: Session = Depends(get_db)) -> StreamingResponse:
    session = _resolve_session(payload, db)
    resolved_model = payload.model or OPENROUTER_MODEL_DEFAULT
    session_id = session.id

    # Persist user message BEFORE streaming — guaranteed to run
    db.add(ChatMessage(session_id=session_id, role="user", content=payload.message, model=resolved_model))
    db.commit()

    async def event_generator():
        full_reply = ""
        try:
            async for delta in stream_reply(
                user_message=payload.message,
                history=[item.model_dump() for item in payload.history],
                model=payload.model,
            ):
                full_reply += delta
                yield f"data: {json.dumps({'delta': delta}, ensure_ascii=True)}\n\n"
        except OpenRouterConfigError as exc:
            yield f"data: {json.dumps({'error': str(exc)}, ensure_ascii=True)}\n\n"
            return
        except RuntimeError as exc:
            yield f"data: {json.dumps({'error': str(exc)}, ensure_ascii=True)}\n\n"
            return

        # Use a fresh db session inside the generator (the outer db is closed by FastAPI)
        from backend.database import SessionLocal

        inner_db = SessionLocal()
        try:
            if full_reply.strip():
                inner_db.add(ChatMessage(session_id=session_id, role="assistant", content=full_reply, model=resolved_model))
                sess = inner_db.query(ChatSession).filter(ChatSession.id == session_id).first()
                if sess:
                    if not sess.title:
                        sess.title = _auto_title(payload.message)
                    sess.updated_at = __import__("datetime").datetime.now(
                        __import__("datetime").timezone.utc
                    ).replace(tzinfo=None)
                inner_db.commit()
        finally:
            inner_db.close()

        yield f"data: {json.dumps({'done': True}, ensure_ascii=True)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
