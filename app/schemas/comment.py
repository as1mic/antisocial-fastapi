from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CommentBase(BaseModel):
    content: str


class CommentCreate(CommentBase):
    pass


class CommentOut(CommentBase):
    id: int
    post_id: int
    author_id: int
    author_username: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CommentUpdate(BaseModel):
    content: str