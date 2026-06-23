from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, UniqueConstraint

from app.core.database import Base


class UserAchievement(Base):
    __tablename__ = "user_achievements"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "achievement_id",
            name="uq_user_achievements_user_achievement",
        ),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    achievement_id = Column(
        Integer,
        ForeignKey("achievements.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    unlocked_at = Column(DateTime, default=datetime.utcnow, nullable=False)