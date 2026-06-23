from datetime import datetime

from pydantic import BaseModel


class AchievementOut(BaseModel):
    id: int
    code: str
    title: str
    description: str
    unlocked_at: datetime