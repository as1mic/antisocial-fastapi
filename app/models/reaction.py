from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class Reaction(Base):
    __tablename__ = "reactions"
    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_reactions_post_user"),
    )

    id = Column(Integer, primary_key=True)
    reaction_type = Column(String(30), nullable=False)
    post_id = Column(
        Integer,
        ForeignKey("posts.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    post = relationship("Post", back_populates="reactions")
    user = relationship("User", back_populates="reactions")

    @property
    def user_username(self) -> str | None:
        return self.user.username if self.user else None