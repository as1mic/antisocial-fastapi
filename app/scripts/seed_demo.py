from app.core.database import SessionLocal
from app.services.achievement_service import ensure_default_achievements
from app.services.demo_seed_service import ensure_demo_seed


def main():
    db = SessionLocal()
    try:
        ensure_default_achievements(db)
        result = ensure_demo_seed(db)
        print("Demo seed completed.")
        print(result)
    finally:
        db.close()


if __name__ == "__main__":
    main()