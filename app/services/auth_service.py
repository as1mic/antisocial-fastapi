from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.schemas.user import UserCreate


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username).first()


def get_user_by_login(db: Session, login: str) -> User | None:
    user = get_user_by_email(db, login)
    if user is not None:
        return user

    return get_user_by_username(db, login)


def authenticate_user(db: Session, login: str, password: str) -> User | None:
    user = get_user_by_login(db, login)
    if user is None:
        return None

    if not verify_password(password, user.hashed_password):
        return None

    return user


def create_user(db: Session, user_data: UserCreate) -> User:
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        bio=user_data.bio,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user