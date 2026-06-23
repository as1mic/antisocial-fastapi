from datetime import datetime

from pydantic import BaseModel

from app.schemas.reaction import ReactionType


class UserCommentActivityOut(BaseModel):
    id: int
    content: str
    post_id: int
    post_title: str
    created_at: datetime
    updated_at: datetime


class UserReactionActivityOut(BaseModel):
    id: int
    reaction_type: ReactionType
    post_id: int
    post_title: str
    created_at: datetime
    updated_at: datetime
