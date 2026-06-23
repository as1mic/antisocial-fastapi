from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True)
    title = Column(String(150), nullable=False)
    content = Column(Text, nullable=False)
    image_url = Column(String(500), nullable=True)
    category = Column(String(30), index=True, nullable=False)
    author_id = Column(
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

    author = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    reactions = relationship("Reaction", back_populates="post", cascade="all, delete-orphan")

    @property
    def author_username(self) -> str | None:
        return self.author.username if self.author else None

    @property
    def comments_count(self) -> int:
        return len(self.comments)

    @property
    def reactions_count(self) -> int:
        return len(self.reactions)
