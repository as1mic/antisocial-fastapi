from sqlalchemy.orm import Session

from app.models.achievement import Achievement
from app.models.comment import Comment
from app.models.hate_follow import HateFollow
from app.models.post import Post
from app.models.reaction import Reaction
from app.models.user_achievement import UserAchievement

DEFAULT_ACHIEVEMENTS = [
    {
        "code": "first_post",
        "title": "First Public Failure",
        "description": "Published the first miserable post.",
    },
    {
        "code": "first_comment",
        "title": "Helpful Hater",
        "description": "Left the first comment under someone else's failure.",
    },
    {
        "code": "reaction_magnet",
        "title": "Reaction Magnet",
        "description": "Collected at least 5 reactions on personal posts.",
    },
    {
        "code": "hated_once",
        "title": "First Hater",
        "description": "Got the first official hater.",
    },
    {
        "code": "public_enemy",
        "title": "Public Enemy",
        "description": "Reached 5 haters.",
    },
    {
        "code": "serial_failure",
        "title": "Serial Failure",
        "description": "Published at least 5 posts.",
    },
]


def ensure_default_achievements(db: Session) -> None:
    existing_codes = {code for (code,) in db.query(Achievement.code).all()}

    for achievement_data in DEFAULT_ACHIEVEMENTS:
        if achievement_data["code"] in existing_codes:
            continue

        db.add(Achievement(**achievement_data))

    db.commit()


def unlock_achievement(db: Session, user_id: int, achievement_code: str) -> None:
    achievement = (
        db.query(Achievement)
        .filter(Achievement.code == achievement_code, Achievement.is_active.is_(True))
        .first()
    )
    if achievement is None:
        return

    existing_link = (
        db.query(UserAchievement)
        .filter(
            UserAchievement.user_id == user_id,
            UserAchievement.achievement_id == achievement.id,
        )
        .first()
    )
    if existing_link is not None:
        return

    db.add(
        UserAchievement(
            user_id=user_id,
            achievement_id=achievement.id,
        )
    )
    db.commit()


def evaluate_user_achievements(db: Session, user_id: int) -> None:
    posts_count = db.query(Post).filter(Post.author_id == user_id).count()
    comments_count = db.query(Comment).filter(Comment.author_id == user_id).count()
    haters_count = (
        db.query(HateFollow)
        .filter(HateFollow.target_user_id == user_id)
        .count()
    )
    reactions_received = (
        db.query(Reaction)
        .join(Post, Reaction.post_id == Post.id)
        .filter(Post.author_id == user_id)
        .count()
    )

    if posts_count >= 1:
        unlock_achievement(db, user_id, "first_post")
    if posts_count >= 5:
        unlock_achievement(db, user_id, "serial_failure")
    if comments_count >= 1:
        unlock_achievement(db, user_id, "first_comment")
    if reactions_received >= 5:
        unlock_achievement(db, user_id, "reaction_magnet")
    if haters_count >= 1:
        unlock_achievement(db, user_id, "hated_once")
    if haters_count >= 5:
        unlock_achievement(db, user_id, "public_enemy")