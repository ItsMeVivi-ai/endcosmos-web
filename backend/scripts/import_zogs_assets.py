from __future__ import annotations

import argparse
import shutil
import unicodedata
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE = Path(r"C:\Users\Vivi\OneDrive\COSMOS\ZOGS")
TARGET_DIR = PROJECT_ROOT / "public" / "assets" / "zogs" / "imported-assets"
VALID_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"}


def slugify_filename(name: str) -> str:
    normalized = unicodedata.normalize("NFKD", name)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii").lower()
    cleaned = []
    prev_dash = False
    for char in ascii_text:
        if char.isalnum():
            cleaned.append(char)
            prev_dash = False
        else:
            if not prev_dash:
                cleaned.append("-")
            prev_dash = True
    slug = "".join(cleaned).strip("-")
    return slug or "image"


def unique_target(path: Path) -> Path:
    if not path.exists():
        return path
    stem = path.stem
    ext = path.suffix
    index = 2
    while True:
        candidate = path.with_name(f"{stem}-{index}{ext}")
        if not candidate.exists():
            return candidate
        index += 1


def import_assets(source_dir: Path) -> int:
    if not source_dir.exists():
        raise FileNotFoundError(f"Source folder not found: {source_dir}")

    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    files = sorted(
        [file for file in source_dir.rglob("*") if file.is_file() and file.suffix.lower() in VALID_EXTENSIONS]
    )

    imported = 0
    for file in files:
        safe_name = slugify_filename(file.stem)
        destination = TARGET_DIR / f"{safe_name}{file.suffix.lower()}"
        destination = unique_target(destination)
        shutil.copy2(file, destination)
        imported += 1
        print(f"Imported: {file.relative_to(source_dir)} -> {destination.name}")

    return imported


def main() -> None:
    parser = argparse.ArgumentParser(description="Import ZOGS image assets into web public folder.")
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_SOURCE,
        help=f"Source folder with images (default: {DEFAULT_SOURCE})",
    )
    args = parser.parse_args()

    total = import_assets(args.source)
    print(f"Done. Imported files: {total}")
    print(f"Target: {TARGET_DIR}")


if __name__ == "__main__":
    main()
