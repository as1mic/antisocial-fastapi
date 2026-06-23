from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    bio: str | None = None


class UserLogin(BaseModel):
    login: str | None = None
    email: EmailStr | None = None
    password: str

    @model_validator(mode="after")
    def validate_login_source(self):
        if not self.login and not self.email:
            raise ValueError("Either login or email must be provided")
        if self.login is None and self.email is not None:
            self.login = self.email
        return self


class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    bio: str | None = None
    created_at: datetime
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


class UserProfile(BaseModel):
    id: int
    username: str
    email: EmailStr
    bio: str | None = None
    created_at: datetime
    is_active: bool
    haters_count: int
    is_hated_by_current_user: bool
    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    bio: str | None = Field(default=None, max_length=500)


class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=128)