from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.comment import Comment
from app.models.achievement import Achievement
from app.models.hate_follow import HateFollow
from app.models.post import Post
from app.models.reaction import Reaction
from app.models.user import User
from app.models.user_achievement import UserAchievement
from app.routers.auth import router as auth_router
from app.routers.comments import router as comments_router
from app.routers.posts import router as posts_router
from app.routers.reactions import router as reactions_router
from app.routers.users import router as users_router
from app.services.achievement_service import ensure_default_achievements

app = FastAPI(
    title=settings.project_name,
    description=settings.project_description,
    version=settings.project_version,
)

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"


@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        ensure_default_achievements(db)
    finally:
        db.close()


app.include_router(auth_router)
app.include_router(comments_router)
app.include_router(posts_router)
app.include_router(reactions_router)
app.include_router(users_router)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def read_root():
    return FileResponse(TEMPLATES_DIR / "index.html")


@app.get("/auth")
def auth_page():
    return FileResponse(TEMPLATES_DIR / "auth.html")


@app.get("/create-post")
def create_post_page():
    return FileResponse(TEMPLATES_DIR / "create_fail.html")


@app.get("/profile")
def profile_page():
    return FileResponse(TEMPLATES_DIR / "profile.html")


@app.get("/health")
def health_check():
    return {"status": "ok"}
