from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.comment import Comment
from app.models.post import Post
from app.models.user import User


def get_user_or_404(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


def get_post_or_404(db: Session, post_id: int) -> Post:
    post = db.query(Post).filter(Post.id == post_id).first()
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )
    return post


def get_comment_or_404(db: Session, comment_id: int) -> Comment:
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if comment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found",
        )
    return comment