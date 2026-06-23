from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.comment import Comment
from app.models.hate_follow import HateFollow
from app.models.post import Post
from app.models.reaction import Reaction
from app.models.saved_post import SavedPost
from app.models.user import User
from app.services.achievement_service import evaluate_user_achievements

DEMO_PASSWORD = "demo123"

DEMO_USERS = [
    {
        "username": "demo_owner",
        "email": "demo_owner@example.com",
        "bio": "Main demo account for showing the app.",
    },
    {
        "username": "demo_friend",
        "email": "demo_friend@example.com",
        "bio": "Leaves comments and reactions on demo posts.",
    },
    {
        "username": "demo_hater",
        "email": "demo_hater@example.com",
        "bio": "Follows people only to judge them.",
    },
]

DEMO_POSTS = [
    {
        "username": "demo_owner",
        "title": "Missed the train and waved at the wrong one",
        "content": "I was so confident that I thanked the driver of a train I was not even taking.",
        "category": "transport",
        "image_url": "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1200&q=80",
    },
    {
        "username": "demo_owner",
        "title": "Presented the old slide deck in class",
        "content": "The teacher politely waited until slide three before asking why the topic was from last month.",
        "category": "university",
        "image_url": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    },
    {
        "username": "demo_friend",
        "title": "Sent a serious email with a meme attached",
        "content": "Turns out dragging files in the wrong tab is still a real skill issue.",
        "category": "work",
        "image_url": "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80",
    },
]

DEMO_COMMENTS = [
    {
        "author": "demo_friend",
        "post_title": "Missed the train and waved at the wrong one",
        "content": "This is painful in a very cinematic way.",
    },
    {
        "author": "demo_hater",
        "post_title": "Presented the old slide deck in class",
        "content": "The confidence was there, the file was not.",
    },
    {
        "author": "demo_owner",
        "post_title": "Sent a serious email with a meme attached",
        "content": "Respectfully, this is elite anti-productivity.",
    },
]

DEMO_REACTIONS = [
    {
        "username": "demo_friend",
        "post_title": "Missed the train and waved at the wrong one",
        "reaction_type": "had_worse",
    },
    {
        "username": "demo_hater",
        "post_title": "Missed the train and waved at the wrong one",
        "reaction_type": "your_fault",
    },
    {
        "username": "demo_owner",
        "post_title": "Sent a serious email with a meme attached",
        "reaction_type": "tough",
    },
]

DEMO_SAVED_POSTS = [
    {
        "username": "demo_owner",
        "post_title": "Sent a serious email with a meme attached",
    },
    {
        "username": "demo_friend",
        "post_title": "Presented the old slide deck in class",
    },
]

DEMO_HATE_FOLLOWS = [
    {
        "hater": "demo_hater",
        "target": "demo_owner",
    },
    {
        "hater": "demo_friend",
        "target": "demo_owner",
    },
]


def demo_credentials():
    return [
        {
            "username": user["username"],
            "email": user["email"],
            "password": DEMO_PASSWORD,
        }
        for user in DEMO_USERS
    ]


def is_demo_seeded(db: Session) -> bool:
    usernames = [user["username"] for user in DEMO_USERS]
    count = db.query(User).filter(User.username.in_(usernames)).count()
    return count == len(usernames)


def get_user_map(db: Session) -> dict[str, User]:
    usernames = [user["username"] for user in DEMO_USERS]
    users = db.query(User).filter(User.username.in_(usernames)).all()
    return {user.username: user for user in users}


def get_post_map(db: Session) -> dict[str, Post]:
    titles = [post["title"] for post in DEMO_POSTS]
    posts = db.query(Post).filter(Post.title.in_(titles)).all()
    return {post.title: post for post in posts}


def ensure_demo_users(db: Session) -> dict[str, User]:
    user_map = get_user_map(db)

    for user_data in DEMO_USERS:
        if user_data["username"] in user_map:
            continue

        user = User(
            username=user_data["username"],
            email=user_data["email"],
            bio=user_data["bio"],
            hashed_password=get_password_hash(DEMO_PASSWORD),
        )
        db.add(user)
        db.flush()
        user_map[user.username] = user

    return user_map


def ensure_demo_posts(db: Session, user_map: dict[str, User]) -> dict[str, Post]:
    post_map = get_post_map(db)

    for post_data in DEMO_POSTS:
        if post_data["title"] in post_map:
            continue

        post = Post(
            title=post_data["title"],
            content=post_data["content"],
            category=post_data["category"],
            image_url=post_data["image_url"],
            author_id=user_map[post_data["username"]].id,
        )
        db.add(post)
        db.flush()
        post_map[post.title] = post

    return post_map


def ensure_demo_comments(db: Session, user_map: dict[str, User], post_map: dict[str, Post]) -> None:
    for comment_data in DEMO_COMMENTS:
        exists = (
            db.query(Comment)
            .filter(
                Comment.author_id == user_map[comment_data["author"]].id,
                Comment.post_id == post_map[comment_data["post_title"]].id,
                Comment.content == comment_data["content"],
            )
            .first()
        )
        if exists is not None:
            continue

        db.add(
            Comment(
                author_id=user_map[comment_data["author"]].id,
                post_id=post_map[comment_data["post_title"]].id,
                content=comment_data["content"],
            )
        )


def ensure_demo_reactions(db: Session, user_map: dict[str, User], post_map: dict[str, Post]) -> None:
    for reaction_data in DEMO_REACTIONS:
        exists = (
            db.query(Reaction)
            .filter(
                Reaction.user_id == user_map[reaction_data["username"]].id,
                Reaction.post_id == post_map[reaction_data["post_title"]].id,
            )
            .first()
        )
        if exists is not None:
            exists.reaction_type = reaction_data["reaction_type"]
            continue

        db.add(
            Reaction(
                user_id=user_map[reaction_data["username"]].id,
                post_id=post_map[reaction_data["post_title"]].id,
                reaction_type=reaction_data["reaction_type"],
            )
        )


def ensure_demo_saved_posts(db: Session, user_map: dict[str, User], post_map: dict[str, Post]) -> None:
    for saved_data in DEMO_SAVED_POSTS:
        exists = (
            db.query(SavedPost)
            .filter(
                SavedPost.user_id == user_map[saved_data["username"]].id,
                SavedPost.post_id == post_map[saved_data["post_title"]].id,
            )
            .first()
        )
        if exists is not None:
            continue

        db.add(
            SavedPost(
                user_id=user_map[saved_data["username"]].id,
                post_id=post_map[saved_data["post_title"]].id,
            )
        )


def ensure_demo_hate_follows(db: Session, user_map: dict[str, User]) -> None:
    for follow_data in DEMO_HATE_FOLLOWS:
        exists = (
            db.query(HateFollow)
            .filter(
                HateFollow.hater_id == user_map[follow_data["hater"]].id,
                HateFollow.target_user_id == user_map[follow_data["target"]].id,
            )
            .first()
        )
        if exists is not None:
            continue

        db.add(
            HateFollow(
                hater_id=user_map[follow_data["hater"]].id,
                target_user_id=user_map[follow_data["target"]].id,
            )
        )


def ensure_demo_seed(db: Session) -> dict:
    user_map = ensure_demo_users(db)
    post_map = ensure_demo_posts(db, user_map)
    ensure_demo_comments(db, user_map, post_map)
    ensure_demo_reactions(db, user_map, post_map)
    ensure_demo_saved_posts(db, user_map, post_map)
    ensure_demo_hate_follows(db, user_map)
    db.commit()

    for user in user_map.values():
        evaluate_user_achievements(db, user.id)

    return {
        "seeded": True,
        "users_count": len(user_map),
        "posts_count": len(post_map),
        "credentials": demo_credentials(),
    }
