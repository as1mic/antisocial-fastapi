from fastapi import APIRouter, Depends, HTTPException, Query, status

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.helpers import get_post_or_404
from app.models.post import Post
from app.models.user import User
from app.schemas.post import PostCategory, PostCreate, PostOut, PostUpdate
from app.services.achievement_service import evaluate_user_achievements

router = APIRouter(
    prefix="/posts",
    tags=["Posts"],
)


@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_post(
    post_data: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = Post(
        title=post_data.title,
        content=post_data.content,
        image_url=post_data.image_url,
        category=post_data.category.value,
        author_id=current_user.id,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    evaluate_user_achievements(db, current_user.id)

    return post


@router.get("", response_model=list[PostOut])
def list_posts(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    author_id: int | None = Query(default=None, ge=1),
    category: PostCategory | None = Query(default=None),
    search: str | None = Query(default=None, min_length=1, max_length=100),
    db: Session = Depends(get_db),
):
    query = db.query(Post)

    if author_id is not None:
        query = query.filter(Post.author_id == author_id)

    if category is not None:
        query = query.filter(Post.category == category.value)

    if search:
        text = f"%{search.strip()}%"
        query = query.filter(
            Post.title.ilike(text) | Post.content.ilike(text)
        )

    return (
        query
        .order_by(Post.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{post_id}", response_model=PostOut)
def get_post(post_id: int, db: Session = Depends(get_db)):
    return get_post_or_404(db, post_id)


@router.put("/{post_id}", response_model=PostOut)
def update_post(
    post_id: int,
    post_data: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = get_post_or_404(db, post_id)

    if post.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own posts",
        )

    if post_data.title is not None:
        post.title = post_data.title

    if post_data.content is not None:
        post.content = post_data.content

    if post_data.image_url is not None:
        post.image_url = post_data.image_url

    if post_data.category is not None:
        post.category = post_data.category.value

    db.commit()
    db.refresh(post)

    return post


@router.delete("/{post_id}", status_code=status.HTTP_200_OK)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = get_post_or_404(db, post_id)

    if post.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own posts",
        )

    db.delete(post)
    db.commit()

    return {"message": "Post deleted successfully"}
