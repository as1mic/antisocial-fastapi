from fastapi import APIRouter, Depends, HTTPException, status

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.helpers import get_post_or_404
from app.models.reaction import Reaction
from app.models.user import User
from app.schemas.reaction import (
    PostReactionsResponse,
    ReactionCreate,
    ReactionOut,
    ReactionSummary,
)
from app.services.achievement_service import evaluate_user_achievements

router = APIRouter(tags=["Reactions"])


@router.post(
    "/posts/{post_id}/reactions",
    response_model=ReactionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_or_update_reaction(
    post_id: int,
    reaction_data: ReactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = get_post_or_404(db, post_id)

    reaction = (
        db.query(Reaction)
        .filter(
            Reaction.post_id == post_id,
            Reaction.user_id == current_user.id,
        )
        .first()
    )

    if reaction is None:
        reaction = Reaction(
            reaction_type=reaction_data.reaction_type.value,
            post_id=post_id,
            user_id=current_user.id,
        )
        db.add(reaction)
    else:
        reaction.reaction_type = reaction_data.reaction_type.value

    db.commit()
    db.refresh(reaction)
    evaluate_user_achievements(db, post.author_id)

    return reaction


@router.get("/posts/{post_id}/reactions", response_model=PostReactionsResponse)
def list_post_reactions(post_id: int, db: Session = Depends(get_db)):
    get_post_or_404(db, post_id)

    reactions = (
        db.query(Reaction)
        .filter(Reaction.post_id == post_id)
        .order_by(Reaction.created_at.asc())
        .all()
    )

    counts = {}
    for reaction in reactions:
        if reaction.reaction_type not in counts:
            counts[reaction.reaction_type] = 0
        counts[reaction.reaction_type] += 1

    summary = [
        ReactionSummary(reaction_type=reaction_type, count=count)
        for reaction_type, count in counts.items()
    ]

    return PostReactionsResponse(reactions=reactions, summary=summary)


@router.delete("/posts/{post_id}/reactions", status_code=status.HTTP_200_OK)
def delete_reaction(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_post_or_404(db, post_id)

    reaction = (
        db.query(Reaction)
        .filter(
            Reaction.post_id == post_id,
            Reaction.user_id == current_user.id,
        )
        .first()
    )

    if reaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reaction not found",
        )

    db.delete(reaction)
    db.commit()

    return {"message": "Reaction deleted successfully"}
