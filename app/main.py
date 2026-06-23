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
from app.models.saved_post import SavedPost
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
UPLOADS_DIR = BASE_DIR / "uploads"


@app.on_event("startup")
def on_startup():
    UPLOADS_DIR.mkdir(exist_ok=True)
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
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


@app.get("/")
def read_root():
    return FileResponse(TEMPLATES_DIR / "index.html")


@app.get("/auth")
def auth_page():
    return FileResponse(TEMPLATES_DIR / "auth.html")


@app.get("/create-post")
def create_post_page():
    return FileResponse(TEMPLATES_DIR / "create_fail.html")


@app.get("/saved")
def saved_posts_page():
    return FileResponse(TEMPLATES_DIR / "saved.html")


@app.get("/activity")
def activity_page():
    return FileResponse(TEMPLATES_DIR / "activity.html")


@app.get("/profile")
def profile_page():
    return FileResponse(TEMPLATES_DIR / "profile.html")


@app.get("/user/{user_id}")
def user_page(user_id: int):
    return FileResponse(TEMPLATES_DIR / "user.html")


@app.get("/post/{post_id}")
def post_page(post_id: int):
    return FileResponse(TEMPLATES_DIR / "post.html")


@app.get("/post/{post_id}/edit")
def edit_post_page(post_id: int):
    return FileResponse(TEMPLATES_DIR / "edit_post.html")


@app.get("/health")
def health_check():
    return {"status": "ok"}
