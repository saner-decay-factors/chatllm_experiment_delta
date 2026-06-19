from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.config import OPENROUTER_MODEL_DEFAULT
from backend.database import get_db
from backend.models import ChatMessage
from backend.models import Session as ChatSession
from backend.schemas.chat import ChatRequest, ChatResponse
from backend.services.openrouter import OpenRouterConfigError, generate_reply, stream_reply


router = APIRouter()


def _get_or_create_session(db: Session, session_id: int | None) -> ChatSession:
    """Return existing session or create a new one."""
    if session_id is not None:
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if session:
            return session
    # Create new session
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    session = ChatSession(title="Nova conversa", created_at=now, updated_at=now)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


async def _generate_title(db: Session, message: str, session: ChatSession) -> str:
    """Auto-generate a concise title from the first user message using the model."""
    try:
        title_text, _ = await generate_reply(
            user_message=(
                "Generate a very short title (maximum 6 words, in the same language as the message below) "
                "that summarises the topic of this conversation starter. "
                "Reply with ONLY the title, no quotes, no punctuation.\n\nMessage:\n" + message
            ),
            history=[],
            model=None,
        )
        title = title_text.strip().strip('"').strip("'")[:60]
        if title:
            session.title = title
            from datetime import datetime, timezone
            session.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
            db.commit()
    except Exception:
        pass  # If title generation fails, keep the default
    return session.title


def _history_from_session(session: ChatSession) -> list[dict]:
    """Build history list from session messages."""
    return [
        {"role": m.role, "content": m.content}
        for m in session.messages
    ]


@router.get("/api/sessions/{session_id}/messages")
def get_session_messages(session_id: int, db: Session = Depends(get_db)):
    """Get all messages for a session."""
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "model": m.model,
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    session = _get_or_create_session(db, payload.session_id)
    history = _history_from_session(session)

    try:
        reply, model_name = await generate_reply(
            user_message=payload.message,
            history=history,
            model=payload.model,
        )
    except OpenRouterConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    resolved_model = payload.model or model_name or OPENROUTER_MODEL_DEFAULT

    db.add(ChatMessage(session_id=session.id, role="user", content=payload.message, model=resolved_model))
    db.add(ChatMessage(session_id=session.id, role="assistant", content=reply, model=resolved_model))

    # Auto-generate title from first user message if still default
    if session.title == "Nova conversa":
        await _generate_title(db, payload.message, session)

    db.commit()

    return ChatResponse(reply=reply, model=resolved_model)


@router.post("/api/chat/stream")
async def chat_stream(payload: ChatRequest, db: Session = Depends(get_db)) -> StreamingResponse:
    resolved_model = payload.model or OPENROUTER_MODEL_DEFAULT

    async def event_generator():
        session = _get_or_create_session(db, payload.session_id)
        history = _history_from_session(session)
        is_first_message = session.title == "Nova conversa"
        full_reply = ""

        try:
            async for delta in stream_reply(
                user_message=payload.message,
                history=history,
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

        if full_reply.strip():
            db.add(
                ChatMessage(
                    session_id=session.id,
                    role="user",
                    content=payload.message,
                    model=resolved_model,
                )
            )
            db.add(
                ChatMessage(
                    session_id=session.id,
                    role="assistant",
                    content=full_reply,
                    model=resolved_model,
                )
            )
            db.commit()

            # Auto-generate title from first user message
            if is_first_message:
                await _generate_title(db, payload.message, session)
                db.commit()

        yield f"data: {json.dumps({'done': True, 'session_id': session.id, 'session_title': session.title}, ensure_ascii=True)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
