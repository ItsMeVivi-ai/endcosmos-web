from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
PUBLIC_ASSETS = PROJECT_ROOT / "public" / "assets"
ZOGS_DIR = PUBLIC_ASSETS / "zogs"
DEFAULT_SOURCE_DIRS = [ZOGS_DIR / "inbox"]

CATEGORY_DIRS = {
    "v1": ZOGS_DIR / "v1",
    "v2": ZOGS_DIR / "v2",
    "catalog": ZOGS_DIR / "catalog",
    "imported": ZOGS_DIR / "imported-assets",
}

VALID_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"}
GENERIC_STEMS = {
    "image",
    "img",
    "photo",
    "picture",
    "screenshot",
    "new",
    "untitled",
    "archivo",
    "file",
    "asset",
    "assets",
    "chatgpt-image",
}

CATEGORY_KEYWORDS = {
    "v1": {"v1", "legacy", "old"},
    "v2": {"v2", "next", "newgen"},
    "catalog": {"catalog", "portada", "cover", "hero", "shortlist", "pick"},
}


@dataclass
class ExistingImage:
    path: Path
    rel_path: Path
    stem_normalized: str
    sha256: str


@dataclass
class PipelineStats:
    processed: int = 0
    renamed: int = 0
    moved: int = 0
    duplicates_hash: int = 0
    duplicates_name: int = 0
    errors: int = 0
    manifest_updated: bool = False


def slugify_filename(name: str) -> str:
    normalized = unicodedata.normalize("NFKD", name)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text).strip("-")
    return re.sub(r"-{2,}", "-", slug)


def normalize_stem_for_similarity(stem: str) -> str:
    slug = slugify_filename(stem)
    slug = re.sub(r"-(\d+)$", "", slug)
    return slug


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def is_generic_name(stem_slug: str) -> bool:
    if not stem_slug or len(stem_slug) < 4:
        return True
    if stem_slug in GENERIC_STEMS:
        return True
    if re.fullmatch(r"[0-9\-]+", stem_slug):
        return True
    if re.fullmatch(r"[a-f0-9]{8,}", stem_slug):
        return True
    if re.fullmatch(r"[a-f0-9\-]{32,}", stem_slug):
        return True
    return False


def infer_category(path: Path) -> str:
    parts = {slugify_filename(part) for part in path.parts}
    if "v1" in parts or "imagenes-v1" in parts:
        return "v1"
    if "v2" in parts or "imagenes-v2" in parts:
        return "v2"
    if "catalog" in parts or "_catalog" in parts:
        return "catalog"

    stem_slug = slugify_filename(path.stem)
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in stem_slug for keyword in keywords):
            return category
    return "imported"


def build_target_name(path: Path, category: str, sha256: str) -> str:
    stem_slug = slugify_filename(path.stem)
    hash8 = sha256[:8]

    if is_generic_name(stem_slug):
        core = f"{category}-asset"
    else:
        core = stem_slug
        if not core.startswith(f"{category}-"):
            core = f"{category}-{core}"

    return f"{core}-{hash8}{path.suffix.lower()}"


def ensure_unique_destination(path: Path, sha256: str) -> Path:
    if not path.exists():
        return path

    existing_hash = file_sha256(path)
    if existing_hash == sha256:
        return path

    index = 2
    while True:
        candidate = path.with_name(f"{path.stem}-{index}{path.suffix}")
        if not candidate.exists():
            return candidate
        if file_sha256(candidate) == sha256:
            return candidate
        index += 1


def gather_existing_images() -> tuple[list[ExistingImage], dict[str, ExistingImage]]:
    entries: list[ExistingImage] = []
    by_hash: dict[str, ExistingImage] = {}

    for file in PUBLIC_ASSETS.rglob("*"):
        if not file.is_file() or file.suffix.lower() not in VALID_EXTENSIONS:
            continue
        sha256 = file_sha256(file)
        rel = file.relative_to(PUBLIC_ASSETS)
        entry = ExistingImage(
            path=file,
            rel_path=rel,
            stem_normalized=normalize_stem_for_similarity(file.stem),
            sha256=sha256,
        )
        entries.append(entry)
        by_hash.setdefault(sha256, entry)

    return entries, by_hash


def name_similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


def find_similar_name(
    stem: str,
    existing: list[ExistingImage],
    threshold: float,
) -> ExistingImage | None:
    normalized = normalize_stem_for_similarity(stem)
    if not normalized:
        return None

    best: ExistingImage | None = None
    best_score = 0.0
    for entry in existing:
        score = name_similarity(normalized, entry.stem_normalized)
        if score >= threshold and score > best_score:
            best_score = score
            best = entry
    return best


def discover_source_files(source_dirs: list[Path]) -> list[Path]:
    candidates: list[Path] = []
    for source_dir in source_dirs:
        if not source_dir.exists():
            continue
        for file in source_dir.rglob("*"):
            if file.is_file() and file.suffix.lower() in VALID_EXTENSIONS:
                candidates.append(file)
    return sorted(candidates)


def append_audit_log(audit_path: Path, lines: list[str]) -> None:
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    if not audit_path.exists():
        audit_path.write_text(
            "# Assets Audit\n\n"
            "Registro automático de normalización, clasificación, deduplicación y actualización de galerías.\n\n",
            encoding="utf-8",
        )
    with audit_path.open("a", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")


def run_gallery_manifest_update(dry_run: bool) -> bool:
    command = [sys.executable, str(PROJECT_ROOT / "backend" / "scripts" / "generate_gallery_manifests.py")]
    if dry_run:
        print(f"[dry-run] {' '.join(command)}")
        return False

    result = subprocess.run(command, cwd=PROJECT_ROOT, check=False)
    return result.returncode == 0


def run_pipeline(source_dirs: list[Path], dry_run: bool, similarity_threshold: float, update_galleries: bool) -> int:
    existing, existing_by_hash = gather_existing_images()
    source_files = discover_source_files(source_dirs)
    audit_path = PROJECT_ROOT / "docs" / "assets-audit.md"

    stats = PipelineStats()
    audit_lines = [
        f"## Run {datetime.now(timezone.utc).isoformat()}",
        f"- Sources: {', '.join(str(path.relative_to(PROJECT_ROOT)) for path in source_dirs)}",
        f"- Dry run: {'yes' if dry_run else 'no'}",
    ]

    if not source_files:
        audit_lines.append("- Changes: sin archivos nuevos detectados")
        append_audit_log(audit_path, audit_lines)
        print("No new image files found in source folders.")
        return 0

    audit_lines.append("- Changes:")

    for file in source_files:
        stats.processed += 1
        try:
            sha256 = file_sha256(file)

            duplicate = existing_by_hash.get(sha256)
            if duplicate is not None:
                stats.duplicates_hash += 1
                audit_lines.append(
                    f"  - duplicate-hash skipped: {file.relative_to(PROJECT_ROOT)} -> {duplicate.rel_path.as_posix()}"
                )
                if not dry_run:
                    file.unlink(missing_ok=True)
                continue

            similar = find_similar_name(file.stem, existing, similarity_threshold)
            if similar is not None:
                stats.duplicates_name += 1
                audit_lines.append(
                    f"  - duplicate-name skipped: {file.relative_to(PROJECT_ROOT)} ~ {similar.rel_path.as_posix()}"
                )
                if not dry_run:
                    file.unlink(missing_ok=True)
                continue

            category = infer_category(file)
            target_dir = CATEGORY_DIRS[category]
            target_dir.mkdir(parents=True, exist_ok=True)

            target_name = build_target_name(file, category, sha256)
            target_path = ensure_unique_destination(target_dir / target_name, sha256)

            action_notes: list[str] = []
            if file.name != target_path.name:
                stats.renamed += 1
                action_notes.append(f"rename {file.name} -> {target_path.name}")

            if file.parent.resolve() != target_dir.resolve():
                stats.moved += 1
                action_notes.append(f"move -> {target_dir.relative_to(PROJECT_ROOT)}")

            if dry_run:
                audit_lines.append(
                    f"  - normalize: {file.relative_to(PROJECT_ROOT)} => {target_path.relative_to(PROJECT_ROOT)}"
                )
            else:
                shutil.move(str(file), str(target_path))
                audit_lines.append(
                    f"  - normalize: {file.relative_to(PROJECT_ROOT)} => {target_path.relative_to(PROJECT_ROOT)}"
                )

                rel = target_path.relative_to(PUBLIC_ASSETS)
                created_entry = ExistingImage(
                    path=target_path,
                    rel_path=rel,
                    stem_normalized=normalize_stem_for_similarity(target_path.stem),
                    sha256=sha256,
                )
                existing.append(created_entry)
                existing_by_hash[sha256] = created_entry

            if action_notes:
                audit_lines.append(f"    - {'; '.join(action_notes)}")

        except Exception as error:
            stats.errors += 1
            audit_lines.append(f"  - error: {file.relative_to(PROJECT_ROOT)} :: {error}")

    if update_galleries and (stats.renamed or stats.moved or stats.duplicates_hash or stats.duplicates_name):
        stats.manifest_updated = run_gallery_manifest_update(dry_run)
        if dry_run:
            audit_lines.append("- gallery: dry-run (no actualizado)")
        elif stats.manifest_updated:
            audit_lines.append("- gallery: manifests actualizados")
        else:
            audit_lines.append("- gallery: error al actualizar manifests")
            stats.errors += 1
    else:
        audit_lines.append("- gallery: sin cambios de assets, no se actualiza")

    audit_lines.append(
        "- summary: "
        + json.dumps(
            {
                "processed": stats.processed,
                "renamed": stats.renamed,
                "moved": stats.moved,
                "duplicates_hash": stats.duplicates_hash,
                "duplicates_name": stats.duplicates_name,
                "errors": stats.errors,
            },
            ensure_ascii=False,
        )
    )

    append_audit_log(audit_path, audit_lines)

    print(
        "Pipeline complete:",
        json.dumps(
            {
                "processed": stats.processed,
                "renamed": stats.renamed,
                "moved": stats.moved,
                "duplicates_hash": stats.duplicates_hash,
                "duplicates_name": stats.duplicates_name,
                "errors": stats.errors,
                "gallery_updated": stats.manifest_updated,
            },
            ensure_ascii=False,
        ),
    )
    return 0 if stats.errors == 0 else 1


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Normalize new assets names, auto-categorize, deduplicate by hash/similar name, "
            "and refresh gallery manifests."
        )
    )
    parser.add_argument(
        "--source",
        type=Path,
        action="append",
        default=None,
        help="Source directory to process (can be used multiple times). Default: public/assets/zogs/inbox",
    )
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without moving files.")
    parser.add_argument(
        "--similarity-threshold",
        type=float,
        default=0.94,
        help="Similarity ratio for name-based duplicate detection (default: 0.94).",
    )
    parser.add_argument(
        "--skip-gallery-update",
        action="store_true",
        help="Do not regenerate gallery manifests after asset updates.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source_dirs = args.source if args.source else DEFAULT_SOURCE_DIRS
    resolved_sources = [source.resolve() for source in source_dirs]
    return run_pipeline(
        source_dirs=resolved_sources,
        dry_run=args.dry_run,
        similarity_threshold=args.similarity_threshold,
        update_galleries=not args.skip_gallery_update,
    )


if __name__ == "__main__":
    raise SystemExit(main())