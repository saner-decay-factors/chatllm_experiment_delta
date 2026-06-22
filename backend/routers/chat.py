from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.config import OPENROUTER_MODEL_DEFAULT
from backend.database import get_db
from backend.models import ChatMessage, ChatSession
from backend.schemas.chat import ChatRequest, ChatResponse
from backend.services.openrouter import (
    OpenRouterConfigError,
    generate_reply,
    generate_title,
    stream_reply,
)


router = APIRouter()


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


def _resolve_session(db: Session, session_id: int | None) -> ChatSession:
    """Retorna a sessao existente ou cria uma nova."""
    if session_id is not None:
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if session:
            return session
    session = ChatSession()
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


async def _maybe_set_title(db: Session, session_id: int, user_message: str, reply: str, model: str | None) -> str | None:
    """Gera titulo automatico se a sessao ainda nao tiver um. Retorna o titulo ou None."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session or session.title is not None:
        return None
    try:
        title = await generate_title(user_message=user_message, reply=reply, model=model)
    except Exception:
        title = "Nova conversa"
    session.title = title
    db.commit()
    db.refresh(session)
    return session.title


@router.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
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

    session = _resolve_session(db, payload.session_id)

    db.add(ChatMessage(session_id=session.id, role="user", content=payload.message, model=resolved_model))
    db.add(ChatMessage(session_id=session.id, role="assistant", content=reply, model=resolved_model))
    db.commit()

    await _maybe_set_title(db, session.id, payload.message, reply, resolved_model)

    return ChatResponse(reply=reply, model=resolved_model)


@router.post("/api/chat/stream")
async def chat_stream(payload: ChatRequest, db: Session = Depends(get_db)) -> StreamingResponse:
    resolved_model = payload.model or OPENROUTER_MODEL_DEFAULT
    session = _resolve_session(db, payload.session_id)

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
            title = await _maybe_set_title(db, session.id, payload.message, full_reply, resolved_model)

        yield f"data: {json.dumps({'done': True, 'session_id': session.id, 'title': title or session.title}, ensure_ascii=True)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
