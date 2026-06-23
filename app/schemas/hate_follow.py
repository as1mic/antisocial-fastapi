from datetime import datetime

from pydantic import BaseModel


class HateFollowOut(BaseModel):
    id: int
    hater_id: int
    target_user_id: int
    created_at: datetime


class HateFollowActionResponse(BaseModel):
    message: str
