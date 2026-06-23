"""add saved posts

Revision ID: 20260623_0002
Revises: 20260623_0001
Create Date: 2026-06-23 01:00:01

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260623_0002"
down_revision: Union[str, Sequence[str], None] = "20260623_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "saved_posts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "post_id", name="uq_saved_posts_user_post"),
    )
    op.create_index(op.f("ix_saved_posts_user_id"), "saved_posts", ["user_id"], unique=False)
    op.create_index(op.f("ix_saved_posts_post_id"), "saved_posts", ["post_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_saved_posts_post_id"), table_name="saved_posts")
    op.drop_index(op.f("ix_saved_posts_user_id"), table_name="saved_posts")
    op.drop_table("saved_posts")
