from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, UniqueConstraint

from app.core.database import Base


class HateFollow(Base):
    __tablename__ = "hate_follows"
    __table_args__ = (
        UniqueConstraint(
            "hater_id",
            "target_user_id",
            name="uq_hate_follows_hater_target",
        ),
    )

    id = Column(Integer, primary_key=True)
    hater_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    target_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)