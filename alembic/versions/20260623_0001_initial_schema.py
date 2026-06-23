"""initial schema

Revision ID: 20260623_0001
Revises: 
Create Date: 2026-06-23 00:00:01

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260623_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "achievements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index(op.f("ix_achievements_code"), "achievements", ["code"], unique=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "hate_follows",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("hater_id", sa.Integer(), nullable=False),
        sa.Column("target_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["hater_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("hater_id", "target_user_id", name="uq_hate_follows_hater_target"),
    )
    op.create_index(op.f("ix_hate_follows_hater_id"), "hate_follows", ["hater_id"], unique=False)
    op.create_index(op.f("ix_hate_follows_target_user_id"), "hate_follows", ["target_user_id"], unique=False)

    op.create_table(
        "posts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("category", sa.String(length=30), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(op.f("ix_posts_author_id"), "posts", ["author_id"], unique=False)
    op.create_index(op.f("ix_posts_category"), "posts", ["category"], unique=False)

    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="CASCADE"),
    )
    op.create_index(op.f("ix_comments_author_id"), "comments", ["author_id"], unique=False)
    op.create_index(op.f("ix_comments_post_id"), "comments", ["post_id"], unique=False)

    op.create_table(
        "reactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("reaction_type", sa.String(length=30), nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("post_id", "user_id", name="uq_reactions_post_user"),
    )
    op.create_index(op.f("ix_reactions_post_id"), "reactions", ["post_id"], unique=False)
    op.create_index(op.f("ix_reactions_user_id"), "reactions", ["user_id"], unique=False)

    op.create_table(
        "user_achievements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("achievement_id", sa.Integer(), nullable=False),
        sa.Column("unlocked_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["achievement_id"], ["achievements.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "achievement_id", name="uq_user_achievements_user_achievement"),
    )
    op.create_index(op.f("ix_user_achievements_achievement_id"), "user_achievements", ["achievement_id"], unique=False)
    op.create_index(op.f("ix_user_achievements_user_id"), "user_achievements", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_user_achievements_user_id"), table_name="user_achievements")
    op.drop_index(op.f("ix_user_achievements_achievement_id"), table_name="user_achievements")
    op.drop_table("user_achievements")

    op.drop_index(op.f("ix_reactions_user_id"), table_name="reactions")
    op.drop_index(op.f("ix_reactions_post_id"), table_name="reactions")
    op.drop_table("reactions")

    op.drop_index(op.f("ix_comments_post_id"), table_name="comments")
    op.drop_index(op.f("ix_comments_author_id"), table_name="comments")
    op.drop_table("comments")

    op.drop_index(op.f("ix_posts_category"), table_name="posts")
    op.drop_index(op.f("ix_posts_author_id"), table_name="posts")
    op.drop_table("posts")

    op.drop_index(op.f("ix_hate_follows_target_user_id"), table_name="hate_follows")
    op.drop_index(op.f("ix_hate_follows_hater_id"), table_name="hate_follows")
    op.drop_table("hate_follows")

    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_table("users")

    op.drop_index(op.f("ix_achievements_code"), table_name="achievements")
    op.drop_table("achievements")
