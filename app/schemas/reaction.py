from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict


class ReactionType(str, Enum):
    tough = "tough"
    your_fault = "your_fault"
    had_worse = "had_worse"
    rest_in_peace = "rest_in_peace"


class ReactionCreate(BaseModel):
    reaction_type: ReactionType


class ReactionOut(BaseModel):
    id: int
    reaction_type: ReactionType
    post_id: int
    user_id: int
    user_username: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReactionSummary(BaseModel):
    reaction_type: ReactionType
    count: int


class PostReactionsResponse(BaseModel):
    reactions: list[ReactionOut]
    summary: list[ReactionSummary]