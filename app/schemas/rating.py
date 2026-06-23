from pydantic import BaseModel


class RatingUserOut(BaseModel):
    user_id: int
    username: str
    haters_count: int
    posts_count: int
    comments_count: int
    reactions_received: int
    score: int