from fastapi import APIRouter, Depends, HTTPException, status

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.services.achievement_service import ensure_default_achievements
from app.services.demo_seed_service import demo_credentials, ensure_demo_seed, is_demo_seeded

router = APIRouter(prefix="/demo", tags=["Demo"])


@router.get("/status")
def demo_status(db: Session = Depends(get_db)):
    return {
        "enabled": settings.demo_seed_enabled,
        "seeded": is_demo_seeded(db),
        "credentials": demo_credentials(),
    }


@router.post("/seed")
def demo_seed(db: Session = Depends(get_db)):
    if not settings.demo_seed_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo seed is disabled",
        )

    ensure_default_achievements(db)
    return ensure_demo_seed(db)
