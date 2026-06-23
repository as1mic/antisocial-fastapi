from fastapi import APIRouter, Depends, HTTPException, status

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.helpers import get_user_or_404
from app.models.achievement import Achievement
from app.models.comment import Comment
from app.models.hate_follow import HateFollow
from app.models.post import Post
from app.models.reaction import Reaction
from app.models.user import User
from app.models.user_achievement import UserAchievement
from app.schemas.achievement import AchievementOut
from app.schemas.activity import UserCommentActivityOut, UserReactionActivityOut
from app.schemas.hate_follow import HateFollowActionResponse, HateFollowOut
from app.schemas.post import PostOut
from app.schemas.rating import RatingUserOut
from app.schemas.user import UserOut, UserPasswordUpdate, UserProfile, UserUpdate
from app.services.achievement_service import evaluate_user_achievements
from app.services.auth_service import get_user_by_email, get_user_by_username
from app.core.security import get_password_hash, verify_password
from app.services.rating_service import get_user_rating

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserOut)
def read_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
def update_my_profile(
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_data.username is not None and user_data.username != current_user.username:
        if get_user_by_username(db, user_data.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username is already taken",
            )

    if user_data.email is not None and user_data.email != current_user.email:
        if get_user_by_email(db, user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already registered",
            )

    if user_data.username is not None:
        current_user.username = user_data.username

    if user_data.email is not None:
        current_user.email = user_data.email

    if user_data.bio is not None:
        current_user.bio = user_data.bio

    db.commit()
    db.refresh(current_user)

    return current_user


@router.patch("/me/password")
def update_my_password(
    password_data: UserPasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()

    return {"message": "Password updated successfully"}


@router.get("/rating", response_model=list[RatingUserOut])
def get_rating(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_user_rating(db)


@router.get("/me/comments", response_model=list[UserCommentActivityOut])
def list_my_comments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(
            Comment.id,
            Comment.content,
            Comment.post_id,
            Post.title.label("post_title"),
            Comment.created_at,
            Comment.updated_at,
        )
        .join(Post, Post.id == Comment.post_id)
        .filter(Comment.author_id == current_user.id)
        .order_by(Comment.created_at.desc())
        .all()
    )

    return [
        UserCommentActivityOut(
            id=row.id,
            content=row.content,
            post_id=row.post_id,
            post_title=row.post_title,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
        for row in rows
    ]


@router.get("/me/reactions", response_model=list[UserReactionActivityOut])
def list_my_reactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(
            Reaction.id,
            Reaction.reaction_type,
            Reaction.post_id,
            Post.title.label("post_title"),
            Reaction.created_at,
            Reaction.updated_at,
        )
        .join(Post, Post.id == Reaction.post_id)
        .filter(Reaction.user_id == current_user.id)
        .order_by(Reaction.created_at.desc())
        .all()
    )

    return [
        UserReactionActivityOut(
            id=row.id,
            reaction_type=row.reaction_type,
            post_id=row.post_id,
            post_title=row.post_title,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
        for row in rows
    ]


@router.get("/{user_id}", response_model=UserProfile)
def get_user_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = get_user_or_404(db, user_id)

    haters_count = (
        db.query(HateFollow)
        .filter(HateFollow.target_user_id == user.id)
        .count()
    )

    is_hated_by_current_user = (
        db.query(HateFollow)
        .filter(
            HateFollow.hater_id == current_user.id,
            HateFollow.target_user_id == user.id,
        )
        .first()
        is not None
    )

    return UserProfile(
        id=user.id,
        username=user.username,
        email=user.email,
        bio=user.bio,
        created_at=user.created_at,
        is_active=user.is_active,
        haters_count=haters_count,
        is_hated_by_current_user=is_hated_by_current_user,
    )


@router.get("/{user_id}/posts", response_model=list[PostOut])
def list_user_posts(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    get_user_or_404(db, user_id)
    return (
        db.query(Post)
        .filter(Post.author_id == user_id)
        .order_by(Post.created_at.desc())
        .all()
    )


@router.post(
    "/{user_id}/hate-follow",
    response_model=HateFollowOut,
    status_code=status.HTTP_201_CREATED,
)
def hate_follow_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target_user = get_user_or_404(db, user_id)

    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot hate-follow yourself",
        )

    existing_hate_follow = (
        db.query(HateFollow)
        .filter(
            HateFollow.hater_id == current_user.id,
            HateFollow.target_user_id == target_user.id,
        )
        .first()
    )

    if existing_hate_follow is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already hate-follow this user",
        )

    hate_follow = HateFollow(
        hater_id=current_user.id,
        target_user_id=target_user.id,
    )
    db.add(hate_follow)
    db.commit()
    db.refresh(hate_follow)
    evaluate_user_achievements(db, target_user.id)

    return HateFollowOut(
        id=hate_follow.id,
        hater_id=hate_follow.hater_id,
        target_user_id=hate_follow.target_user_id,
        created_at=hate_follow.created_at,
    )


@router.delete(
    "/{user_id}/hate-follow",
    response_model=HateFollowActionResponse,
)
def remove_hate_follow(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_user_or_404(db, user_id)

    hate_follow = (
        db.query(HateFollow)
        .filter(
            HateFollow.hater_id == current_user.id,
            HateFollow.target_user_id == user_id,
        )
        .first()
    )

    if hate_follow is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hate-follow not found",
        )

    db.delete(hate_follow)
    db.commit()

    return HateFollowActionResponse(message="Hate-follow removed successfully")


@router.get("/{user_id}/haters", response_model=list[UserOut])
def list_user_haters(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    get_user_or_404(db, user_id)

    haters = (
        db.query(User)
        .join(HateFollow, HateFollow.hater_id == User.id)
        .filter(HateFollow.target_user_id == user_id)
        .order_by(HateFollow.created_at.desc())
        .all()
    )

    return haters


@router.get("/{user_id}/achievements", response_model=list[AchievementOut])
def list_user_achievements(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    get_user_or_404(db, user_id)

    achievements = (
        db.query(
            Achievement.id,
            Achievement.code,
            Achievement.title,
            Achievement.description,
            UserAchievement.unlocked_at,
        )
        .join(UserAchievement, UserAchievement.achievement_id == Achievement.id)
        .filter(UserAchievement.user_id == user_id)
        .order_by(UserAchievement.unlocked_at.desc())
        .all()
    )

    return [
        AchievementOut(
            id=achievement.id,
            code=achievement.code,
            title=achievement.title,
            description=achievement.description,
            unlocked_at=achievement.unlocked_at,
        )
        for achievement in achievements
    ]
