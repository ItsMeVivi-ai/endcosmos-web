import os
import secrets
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.routes.admin import _require_admin


router = APIRouter(prefix="/admin/images", tags=["Admin Images"])


IMAGE_STORAGE_PATH = Path(os.getenv("IMAGE_STORAGE_PATH", "backend/data/uploaded_images")).resolve()
MAX_IMAGE_SIZE_MB = max(1, int(os.getenv("MAX_IMAGE_SIZE_MB", "25")))
MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024
ALLOWED_IMAGE_EXTENSIONS = {
    ext.strip().lower().lstrip(".")
    for ext in os.getenv("ALLOWED_IMAGE_EXTENSIONS", "png,jpg,jpeg,webp,avif,gif").split(",")
    if ext.strip()
}


def _safe_suffix(filename: str | None) -> str:
    if not filename:
        return ""

    suffix = Path(filename).suffix.lower().lstrip(".")
    if suffix in ALLOWED_IMAGE_EXTENSIONS:
        return f".{suffix}"
    return ""


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    _: dict = Depends(_require_admin),
) -> dict:
    IMAGE_STORAGE_PATH.mkdir(parents=True, exist_ok=True)

    suffix = _safe_suffix(file.filename)
    if not suffix:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image extension. Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}",
        )

    payload = await file.read(MAX_IMAGE_SIZE_BYTES + 1)
    if len(payload) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image too large. Max size is {MAX_IMAGE_SIZE_MB} MB",
        )

    if len(payload) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    token = secrets.token_hex(8)
    stored_name = f"{timestamp}-{token}{suffix}"
    destination = IMAGE_STORAGE_PATH / stored_name

    destination.write_bytes(payload)

    return {
        "success": True,
        "filename": stored_name,
        "bytes": len(payload),
        "storage_path": str(destination),
        "download_url": f"/admin/images/file/{stored_name}",
    }


@router.get("/file/{filename}")
def get_image_file(
    filename: str,
    _: dict = Depends(_require_admin),
):
    target = (IMAGE_STORAGE_PATH / filename).resolve()
    if IMAGE_STORAGE_PATH not in target.parents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename")

    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    return FileResponse(path=target)


@router.get("/list")
def list_images(_: dict = Depends(_require_admin)) -> dict:
    IMAGE_STORAGE_PATH.mkdir(parents=True, exist_ok=True)
    files = sorted(
        [
            p for p in IMAGE_STORAGE_PATH.iterdir()
            if p.is_file() and p.suffix.lower().lstrip(".") in ALLOWED_IMAGE_EXTENSIONS
        ],
        key=lambda item: item.stat().st_mtime,
        reverse=True,
    )

    data = [
        {
            "filename": p.name,
            "bytes": p.stat().st_size,
            "modified_at": datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc).isoformat(),
            "download_url": f"/admin/images/file/{p.name}",
        }
        for p in files
    ]

    return {"success": True, "count": len(data), "images": data}
