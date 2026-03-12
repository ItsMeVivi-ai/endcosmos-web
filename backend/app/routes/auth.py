from datetime import datetime, timedelta, timezone
import os
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_client_ip, hash_password, verify_password
from app.database import get_db
from app.models import EmailVerification, LoginLog, User, UserProfile
from app.schemas import AuthResponse, LoginRequest, RegisterRequest, UserDataResponse


router = APIRouter(tags=["Auth"])


FAILED_LOGIN_WINDOW_MINUTES = max(1, int(os.getenv("FAILED_LOGIN_WINDOW_MINUTES", "15")))
MAX_FAILED_LOGIN_PER_IP = max(1, int(os.getenv("MAX_FAILED_LOGIN_PER_IP", "20")))
MAX_FAILED_LOGIN_PER_IDENTITY = max(1, int(os.getenv("MAX_FAILED_LOGIN_PER_IDENTITY", "8")))
REGISTER_WINDOW_MINUTES = max(1, int(os.getenv("REGISTER_WINDOW_MINUTES", "60")))
MAX_REGISTRATIONS_PER_IP = max(1, int(os.getenv("MAX_REGISTRATIONS_PER_IP", "6")))
MIN_REGISTER_AGE = max(13, int(os.getenv("MIN_REGISTER_AGE", "16")))


def _count_recent_failed_logins(
    db: Session,
    *,
    window_start: datetime,
    attempted_identity: str | None = None,
    ip_address: str | None = None,
) -> int:
    filters = [LoginLog.success.is_(False), LoginLog.created_at >= window_start]
    if attempted_identity:
        filters.append(LoginLog.attempted_identity == attempted_identity)
    if ip_address:
        filters.append(LoginLog.ip_address == ip_address)

    stmt = select(func.count()).select_from(LoginLog).where(*filters)
    return int(db.execute(stmt).scalar_one() or 0)


def _count_recent_registrations_by_ip(db: Session, *, window_start: datetime, ip_address: str) -> int:
    stmt = select(func.count()).select_from(User).where(
        User.ip_register == ip_address,
        User.created_at >= window_start,
    )
    return int(db.execute(stmt).scalar_one() or 0)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    """Register a new EndCosmos account."""
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Password and confirm password do not match")

    today = datetime.now(timezone.utc).date()
    age = (
        today.year
        - payload.birth_date.year
        - ((today.month, today.day) < (payload.birth_date.month, payload.birth_date.day))
    )
    if age < MIN_REGISTER_AGE:
        raise HTTPException(
            status_code=403,
            detail=f"Minimum age to register is {MIN_REGISTER_AGE}",
        )

    username = payload.username.strip()
    email = payload.email.lower().strip()

    existing_stmt = select(User).where(or_(User.username == username, User.email == email))
    existing_user = db.execute(existing_stmt).scalar_one_or_none()
    if existing_user:
        if existing_user.username == username:
            raise HTTPException(status_code=409, detail="Username is already in use")
        raise HTTPException(status_code=409, detail="Email is already in use")

    ip_address = get_client_ip(
        forwarded_for=request.headers.get("x-forwarded-for"),
        remote_host=request.client.host if request.client else None,
    )
    if ip_address:
        register_window_start = datetime.now(timezone.utc) - timedelta(minutes=REGISTER_WINDOW_MINUTES)
        recent_registrations = _count_recent_registrations_by_ip(
            db,
            window_start=register_window_start,
            ip_address=ip_address,
        )
        if recent_registrations >= MAX_REGISTRATIONS_PER_IP:
            raise HTTPException(
                status_code=429,
                detail="Too many registration attempts from this IP. Please try again later.",
            )

    new_user = User(
        username=username,
        email=email,
        password_hash=hash_password(payload.password),
        role="player",
        tier="bronze",
        cosmic_rank=0,
        source=payload.source,
        is_active=True,
        is_verified=False,
        ip_register=ip_address,
    )

    new_profile = UserProfile(
        user=new_user,
        display_name=username,
    )

    verification = EmailVerification(
        user=new_user,
        token=secrets.token_urlsafe(48),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )

    db.add(new_user)
    db.add(new_profile)
    db.add(verification)

    try:
        db.commit()
        db.refresh(new_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Conflicting account data")

    user_data = UserDataResponse.model_validate(new_user)
    return AuthResponse(success=True, message="User registered successfully", user=user_data)


@router.post("/login", response_model=AuthResponse)
def login_user(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Login with username or email and return JWT token."""
    identity = payload.username_or_email.strip()
    normalized_email = identity.lower()
    identity_key = normalized_email if "@" in identity else identity.lower()

    ip_address = get_client_ip(
        forwarded_for=request.headers.get("x-forwarded-for"),
        remote_host=request.client.host if request.client else None,
    )
    user_agent = request.headers.get("user-agent")
    login_window_start = datetime.now(timezone.utc) - timedelta(minutes=FAILED_LOGIN_WINDOW_MINUTES)

    failed_by_identity = _count_recent_failed_logins(
        db,
        window_start=login_window_start,
        attempted_identity=identity_key,
    )
    failed_by_ip = (
        _count_recent_failed_logins(
            db,
            window_start=login_window_start,
            ip_address=ip_address,
        )
        if ip_address
        else 0
    )

    if failed_by_identity >= MAX_FAILED_LOGIN_PER_IDENTITY or failed_by_ip >= MAX_FAILED_LOGIN_PER_IP:
        db.add(
            LoginLog(
                user_id=None,
                attempted_identity=identity_key,
                ip_address=ip_address,
                user_agent=user_agent,
                source=payload.source,
                success=False,
            )
        )
        db.commit()
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Please wait and try again.",
        )

    user_stmt = select(User).where(or_(User.username == identity, User.email == normalized_email))
    user = db.execute(user_stmt).scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        db.add(
            LoginLog(
                user_id=user.id if user else None,
                attempted_identity=identity_key,
                ip_address=ip_address,
                user_agent=user_agent,
                source=payload.source,
                success=False,
            )
        )
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is disabled")

    user.last_login = datetime.now(timezone.utc)
    db.add(
        LoginLog(
            user_id=user.id,
            attempted_identity=identity_key,
            ip_address=ip_address,
            user_agent=user_agent,
            source=payload.source,
            success=True,
        )
    )

    token = create_access_token(
        {
            "sub": str(user.id),
            "username": user.username,
            "role": user.role,
            "source": payload.source,
        }
    )

    db.commit()
    db.refresh(user)

    user_data = UserDataResponse.model_validate(user)
    return AuthResponse(
        success=True,
        message="Login successful",
        user=user_data,
        access_token=token,
        token_type="bearer",
    )
