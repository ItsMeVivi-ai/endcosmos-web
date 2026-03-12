from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import decode_access_token
from app.database import get_db
from app.models import LoginLog, User


router = APIRouter(prefix="/admin", tags=["Admin"])


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization token")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header")

    return token.strip()


def _require_admin(authorization: str | None = Header(default=None)) -> dict:
    token = _extract_bearer_token(authorization)
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    role = str(payload.get("role", "")).lower()
    if role not in {"admin", "super_admin", "superadmin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")

    return payload


@router.get("/overview")
def get_admin_overview(
    _: dict = Depends(_require_admin),
    db: Session = Depends(get_db),
) -> dict:
    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(hours=24)
    week_ago = now - timedelta(days=7)

    total_users = int(db.execute(select(func.count()).select_from(User)).scalar_one() or 0)
    active_users = int(
        db.execute(select(func.count()).select_from(User).where(User.is_active.is_(True))).scalar_one() or 0
    )
    verified_users = int(
        db.execute(select(func.count()).select_from(User).where(User.is_verified.is_(True))).scalar_one() or 0
    )
    new_users_7d = int(
        db.execute(select(func.count()).select_from(User).where(User.created_at >= week_ago)).scalar_one() or 0
    )
    successful_logins_24h = int(
        db.execute(
            select(func.count())
            .select_from(LoginLog)
            .where(LoginLog.success.is_(True), LoginLog.created_at >= day_ago)
        ).scalar_one()
        or 0
    )
    failed_logins_24h = int(
        db.execute(
            select(func.count())
            .select_from(LoginLog)
            .where(LoginLog.success.is_(False), LoginLog.created_at >= day_ago)
        ).scalar_one()
        or 0
    )

    latest_users_stmt = (
        select(User.username, User.role, User.is_active, User.last_login)
        .order_by(User.created_at.desc())
        .limit(8)
    )
    latest_users = []
    for username, role, is_active, last_login in db.execute(latest_users_stmt).all():
        latest_users.append(
            {
                "name": username,
                "role": role,
                "status": "Online" if is_active else "Offline",
                "last": last_login.isoformat() if last_login else None,
            }
        )

    success_ratio = (
        round((successful_logins_24h / (successful_logins_24h + failed_logins_24h)) * 100, 2)
        if (successful_logins_24h + failed_logins_24h) > 0
        else 0.0
    )

    return {
        "success": True,
        "data": {
            "metrics": {
                "total_users": total_users,
                "active_users": active_users,
                "verified_users": verified_users,
                "new_users_7d": new_users_7d,
                "successful_logins_24h": successful_logins_24h,
                "failed_logins_24h": failed_logins_24h,
                "login_success_ratio": success_ratio,
            },
            "users": latest_users,
            "activity": [
                f"Usuarios totales: {total_users}",
                f"Nuevos usuarios (7d): {new_users_7d}",
                f"Login exitoso 24h: {successful_logins_24h}",
                f"Login fallido 24h: {failed_logins_24h}",
            ],
        },
    }