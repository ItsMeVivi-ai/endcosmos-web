import os
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import jwt
from jose.exceptions import JWTError
from passlib.context import CryptContext


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEBUG = os.getenv("DEBUG", "false").strip().lower() == "true"
TRUST_PROXY_HEADERS = os.getenv("TRUST_PROXY_HEADERS", "false").strip().lower() == "true"
SECRET_KEY = os.getenv("SECRET_KEY", "").strip()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

if not SECRET_KEY or SECRET_KEY in {"replace_me", "replace_with_a_long_random_secret"}:
    if not DEBUG:
        raise RuntimeError("SECRET_KEY must be set with a strong random value in non-debug environments.")
    SECRET_KEY = "dev-insecure-secret-key-change-before-production"

if len(SECRET_KEY) < 32 and not DEBUG:
    raise RuntimeError("SECRET_KEY must be at least 32 characters in non-debug environments.")


def hash_password(password: str) -> str:
    """Hash passwords with bcrypt via Passlib."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify plain password against stored hash."""
    return pwd_context.verify(plain_password, password_hash)


def create_access_token(data: dict[str, Any]) -> str:
    """Create JWT access token for future auth-protected routes."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {**data, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode JWT token. Returns payload or None when token is invalid/expired."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None

    return payload if isinstance(payload, dict) else None


def get_client_ip(forwarded_for: str | None, remote_host: str | None) -> str | None:
    """Get client IP considering proxy headers in production."""
    if TRUST_PROXY_HEADERS and forwarded_for:
        first_ip = forwarded_for.split(",")[0].strip()
        if first_ip:
            return first_ip
    return remote_host
