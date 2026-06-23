from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.helpers import get_post_or_404
from app.models.comment import Comment
from app.models.post import Post
from app.models.reaction import Reaction
from app.models.saved_post import SavedPost
from app.models.user import User
from app.schemas.post import PostCategory, PostOut, PostSort, PostUpdate
from app.services.achievement_service import evaluate_user_achievements
from app.services.file_service import save_uploaded_file

router = APIRouter(
    prefix="/posts",
    tags=["Posts"],
)


@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_post(
    title: str = Form(...),
    content: str = Form(...),
    category: PostCategory = Form(...),
    image_url: str | None = Form(default=None),
    image: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    final_image_url = image_url.strip() if image_url else None

    if image is not None and image.filename:
        final_image_url = save_uploaded_file(image)

    post = Post(
        title=title,
        content=content,
        image_url=final_image_url,
        category=category.value,
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
    sort: PostSort = Query(default=PostSort.newest),
    search: str | None = Query(default=None, min_length=1, max_length=100),
    db: Session = Depends(get_db),
):
    comment_counts = (
        db.query(
            Comment.post_id.label("post_id"),
            func.count(Comment.id).label("comments_count"),
        )
        .group_by(Comment.post_id)
        .subquery()
    )

    reaction_counts = (
        db.query(
            Reaction.post_id.label("post_id"),
            func.count(Reaction.id).label("reactions_count"),
        )
        .group_by(Reaction.post_id)
        .subquery()
    )

    query = (
        db.query(Post)
        .outerjoin(comment_counts, comment_counts.c.post_id == Post.id)
        .outerjoin(reaction_counts, reaction_counts.c.post_id == Post.id)
    )

    if author_id is not None:
        query = query.filter(Post.author_id == author_id)

    if category is not None:
        query = query.filter(Post.category == category.value)

    if search:
        text = f"%{search.strip()}%"
        query = query.filter(
            Post.title.ilike(text) | Post.content.ilike(text)
        )

    if sort == PostSort.most_discussed:
        query = query.order_by(
            func.coalesce(comment_counts.c.comments_count, 0).desc(),
            Post.created_at.desc(),
        )
    elif sort == PostSort.most_reacted:
        query = query.order_by(
            func.coalesce(reaction_counts.c.reactions_count, 0).desc(),
            Post.created_at.desc(),
        )
    else:
        query = query.order_by(Post.created_at.desc())

    return (
        query
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/saved", response_model=list[PostOut])
def list_saved_posts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Post)
        .join(SavedPost, SavedPost.post_id == Post.id)
        .filter(SavedPost.user_id == current_user.id)
        .order_by(SavedPost.created_at.desc())
        .all()
    )


@router.get("/saved/ids", response_model=list[int])
def list_saved_post_ids(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(SavedPost.post_id)
        .filter(SavedPost.user_id == current_user.id)
        .all()
    )
    return [row.post_id for row in rows]


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


@router.post("/{post_id}/save", status_code=status.HTTP_201_CREATED)
def save_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_post_or_404(db, post_id)

    existing_saved_post = (
        db.query(SavedPost)
        .filter(
            SavedPost.user_id == current_user.id,
            SavedPost.post_id == post_id,
        )
        .first()
    )

    if existing_saved_post is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Post is already saved",
        )

    saved_post = SavedPost(
        user_id=current_user.id,
        post_id=post_id,
    )
    db.add(saved_post)
    db.commit()

    return {"message": "Post saved successfully"}


@router.delete("/{post_id}/save", status_code=status.HTTP_200_OK)
def remove_saved_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    saved_post = (
        db.query(SavedPost)
        .filter(
            SavedPost.user_id == current_user.id,
            SavedPost.post_id == post_id,
        )
        .first()
    )

    if saved_post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved post not found",
        )

    db.delete(saved_post)
    db.commit()

    return {"message": "Saved post removed successfully"}


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