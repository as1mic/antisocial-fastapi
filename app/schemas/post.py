from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict


class PostCategory(str, Enum):
    university = "university"
    work = "work"
    transport = "transport"
    relationships = "relationships"
    money = "money"
    random = "random"


class PostBase(BaseModel):
    title: str
    content: str
    image_url: str | None = None
    category: PostCategory


class PostCreate(PostBase):
    pass


class PostUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    image_url: str | None = None
    category: PostCategory | None = None


class PostOut(PostBase):
    id: int
    author_id: int
    author_username: str | None = None
    comments_count: int = 0
    reactions_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
