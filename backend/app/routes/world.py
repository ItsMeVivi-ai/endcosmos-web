from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field

from app.auth import decode_access_token
from app.internal_world_db import (
    add_image_to_house,
    get_repertoire_stats,
    get_world_tree,
    sync_full_repertoire,
)


router = APIRouter(prefix="/world", tags=["World Classes"])


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization token")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header")

    return token.strip()


def _assert_admin(authorization: str | None) -> None:
    token = _extract_bearer_token(authorization)
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    role = str(payload.get("role", "")).lower()
    if role not in {"admin", "super_admin", "superadmin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")


class AddHouseImageRequest(BaseModel):
    image_path: str = Field(min_length=5, max_length=255)
    title: str = Field(min_length=3, max_length=120)
    power_level: int = Field(default=8, ge=1, le=10)


class SyncRepertoireRequest(BaseModel):
    max_images: int | None = Field(default=None, ge=1, le=20000)


@router.get("/tree")
def world_tree() -> dict:
    classes = get_world_tree()
    return {
        "success": True,
        "data": {
            "classes": classes,
            "total_classes": len(classes),
            "total_houses": sum(item["total_houses"] for item in classes),
            "total_images": sum(item["total_images"] for item in classes),
        },
    }


@router.post("/admin/houses/{house_slug}/images")
def add_house_image(
    house_slug: str,
    payload: AddHouseImageRequest,
    authorization: str | None = Header(default=None),
) -> dict:
    _assert_admin(authorization)

    if not payload.image_path.startswith("/assets/"):
        raise HTTPException(status_code=400, detail="image_path must start with /assets/")

    created = add_image_to_house(
        house_slug=house_slug,
        image_path=payload.image_path,
        title=payload.title,
        power_level=payload.power_level,
    )
    if not created:
        raise HTTPException(status_code=404, detail="House not found")

    return {"success": True, "message": "Image linked to house", "data": created}


@router.get("/catalog/stats")
def world_catalog_stats() -> dict:
    return {"success": True, "data": get_repertoire_stats()}


@router.post("/admin/sync-repertoire")
def admin_sync_repertoire(
    payload: SyncRepertoireRequest,
    authorization: str | None = Header(default=None),
) -> dict:
    _assert_admin(authorization)
    sync_result = sync_full_repertoire(max_images=payload.max_images)
    return {
        "success": True,
        "message": "World synchronized with full repertoire",
        "data": sync_result,
    }
