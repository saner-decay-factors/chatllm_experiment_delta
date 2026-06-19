from __future__ import annotations

from pathlib import Path

from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from backend.database import Base, SessionLocal, engine
from backend.models import Session, User  # noqa: F401 — force import so table is created
from backend.routers.auth import hash_password
from backend.routers.chat import router as chat_router
from backend.routers.sessions import router as sessions_router
from backend.routers.auth import router as auth_router


def seed_default_user():
    """Create a default user for testing if none exists."""
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "admin@teste.com").first()
        if not existing:
            db.add(
                User(
                    email="admin@teste.com",
                    hashed_password=hash_password("123456"),
                )
            )
            db.commit()
            print(">>> Default user created: admin@teste.com / 123456")
    except Exception:
        pass
    finally:
        db.close()


Base.metadata.create_all(bind=engine)
seed_default_user()

app = FastAPI(title="ChatLLM Experiment API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class NoCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response: Response = await call_next(request)
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response


app.add_middleware(NoCacheMiddleware)

app.include_router(chat_router)
app.include_router(sessions_router)
app.include_router(auth_router)

NO_CACHE_HEADERS = {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
}

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend"

if FRONTEND_DIR.exists():
    app.mount("/frontend", StaticFiles(directory=FRONTEND_DIR), name="frontend")


@app.get("/")
def root() -> FileResponse:
    index_path = FRONTEND_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="frontend/index.html nao encontrado")
    return FileResponse(index_path, headers=NO_CACHE_HEADERS)
