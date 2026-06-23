from fastapi import APIRouter, Depends, HTTPException, status

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.helpers import get_comment_or_404, get_post_or_404
from app.models.comment import Comment
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentOut, CommentUpdate
from app.services.achievement_service import evaluate_user_achievements

router = APIRouter(tags=["Comments"])


@router.post(
    "/posts/{post_id}/comments",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    post_id: int,
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_post_or_404(db, post_id)

    comment = Comment(
        content=comment_data.content,
        post_id=post_id,
        author_id=current_user.id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    evaluate_user_achievements(db, current_user.id)

    return comment


@router.get("/posts/{post_id}/comments", response_model=list[CommentOut])
def list_post_comments(post_id: int, db: Session = Depends(get_db)):
    get_post_or_404(db, post_id)

    return (
        db.query(Comment)
        .filter(Comment.post_id == post_id)
        .order_by(Comment.created_at.asc())
        .all()
    )


@router.put("/comments/{comment_id}", response_model=CommentOut)
def update_comment(
    comment_id: int,
    comment_data: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = get_comment_or_404(db, comment_id)

    if comment.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own comments",
        )

    comment.content = comment_data.content
    db.commit()
    db.refresh(comment)

    return comment


@router.delete("/comments/{comment_id}", status_code=status.HTTP_200_OK)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = get_comment_or_404(db, comment_id)

    if comment.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own comments",
        )

    db.delete(comment)
    db.commit()

    return {"message": "Comment deleted successfully"}