from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


USERNAME_PATTERN = r"^[A-Za-z0-9_]{3,16}$"
DANGEROUS_CHARS = {"<", ">", "'", '"', "`", ";"}


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=16, pattern=USERNAME_PATTERN)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)
    source: Literal["web", "launcher", "panel", "discord", "google"] = "web"

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        clean = value.strip()
        if clean != value:
            raise ValueError("Username cannot start or end with spaces")
        return clean

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if any(char in value for char in DANGEROUS_CHARS):
            raise ValueError("Password contains unsupported special characters")
        if "--" in value:
            raise ValueError("Password contains blocked sequence")
        return value

    @field_validator("confirm_password")
    @classmethod
    def validate_confirm_password(cls, value: str) -> str:
        if any(char in value for char in DANGEROUS_CHARS):
            raise ValueError("Confirm password contains unsupported special characters")
        return value


class LoginRequest(BaseModel):
    username_or_email: str = Field(min_length=3, max_length=191)
    password: str = Field(min_length=8, max_length=128)
    source: Literal["web", "launcher", "panel", "discord", "google"] = "web"

    @field_validator("username_or_email")
    @classmethod
    def clean_identity(cls, value: str) -> str:
        clean = value.strip()
        if not clean:
            raise ValueError("username_or_email cannot be empty")
        return clean


class UserDataResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    role: str
    tier: str
    cosmic_rank: int
    source: str
    is_active: bool
    is_verified: bool
    created_at: datetime


class AuthResponse(BaseModel):
    success: bool
    message: str
    user: UserDataResponse | None = None
    access_token: str | None = None
    token_type: str | None = None


class HealthResponse(BaseModel):
    success: bool
    service: str
    status: str
