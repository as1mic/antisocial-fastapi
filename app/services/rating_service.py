from sqlalchemy.orm import Session

from app.models.comment import Comment
from app.models.hate_follow import HateFollow
from app.models.post import Post
from app.models.reaction import Reaction
from app.models.user import User


def get_user_rating(db: Session) -> list[dict]:
    users = db.query(User).all()
    results = []

    for user in users:
        posts_count = db.query(Post).filter(Post.author_id == user.id).count()
        comments_count = db.query(Comment).filter(Comment.author_id == user.id).count()
        haters_count = (
            db.query(HateFollow)
            .filter(HateFollow.target_user_id == user.id)
            .count()
        )
        reactions_received = (
            db.query(Reaction)
            .join(Post, Reaction.post_id == Post.id)
            .filter(Post.author_id == user.id)
            .count()
        )

        score = (
            haters_count * 5
            + reactions_received * 3
            + posts_count * 2
            + comments_count
        )

        results.append(
            {
                "user_id": user.id,
                "username": user.username,
                "haters_count": haters_count,
                "posts_count": posts_count,
                "comments_count": comments_count,
                "reactions_received": reactions_received,
                "score": score,
            }
        )

    return sorted(results, key=lambda user: (-user["score"], user["username"].lower()))