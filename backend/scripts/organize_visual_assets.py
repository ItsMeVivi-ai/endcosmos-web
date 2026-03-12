from __future__ import annotations

import hashlib
import json
import re
import shutil
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PUBLIC_DIR = PROJECT_ROOT / "public"
ASSETS_DIR = PUBLIC_DIR / "assets"
IMAGES_ROOT = ASSETS_DIR / "images"
MANIFESTS_DIR = ASSETS_DIR / "manifests"
DOCS_DIR = PROJECT_ROOT / "docs"

VALID_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".bmp", ".svg", ".ico"}
TEXT_EXTENSIONS = {".html", ".css", ".js", ".ts", ".jsx", ".tsx", ".json"}

CATEGORY_ORDER = [
    "hero",
    "cities",
    "maps",
    "npcs",
    "bosses",
    "mounts",
    "pets",
    "backgrounds",
    "portals",
    "ui",
    "lore",
]

CATEGORY_KEYWORDS = {
    "hero": ["hero", "cover", "banner", "portada"],
    "cities": ["city", "ciudad", "palace", "palacio", "capital", "skyline", "district"],
    "maps": ["map", "mapa", "world", "realm", "region", "atlas"],
    "npcs": ["npc", "guide", "guardian", "character", "persona", "champion"],
    "bosses": ["boss", "battle", "raid", "warrior", "dragon", "serpent", "dungeon"],
    "mounts": ["mount", "montura", "dragon-rider", "ride", "steed"],
    "pets": ["pet", "mascota", "companion"],
    "backgrounds": ["background", "bg", "nebula", "space", "cosmic", "void", "sky", "bosque"],
    "portals": ["portal", "gate", "rift"],
    "ui": ["logo", "icon", "favicon", "ui", "interface", "button", "overlay"],
    "lore": ["lore", "story", "historia", "faction", "universe", "codex"],
}

SOURCE_DIRS = [
    ASSETS_DIR,
    ASSETS_DIR / "images",
    ASSETS_DIR / "zogs" / "imported-assets",
    ASSETS_DIR / "zogs" / "v1",
    ASSETS_DIR / "zogs" / "v2",
    ASSETS_DIR / "zogs" / "catalog",
]


@dataclass
class AssetEntry:
    source_path: Path
    source_web: str
    target_path: Path
    target_web: str
    category: str
    size_bytes: int
    sha256: str


ASSET_REF_REGEX = re.compile(
    r"(/assets/[A-Za-z0-9_\-./ %]+?\.(?:png|jpg|jpeg|webp|avif|gif|bmp|svg|ico))",
    re.IGNORECASE,
)


def to_web_path(path: Path) -> str:
    return f"/{path.relative_to(PUBLIC_DIR).as_posix()}"


def normalize_text(value: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    ascii_text = ascii_text.lower().strip()
    ascii_text = re.sub(r"[^a-z0-9]+", "-", ascii_text)
    return ascii_text.strip("-")


def slugify_filename(stem: str) -> str:
    slug = normalize_text(stem)
    return slug or "asset"


def infer_category(path: Path) -> str:
    lowered_parts = [part.lower() for part in path.parts]
    lowered_name = path.stem.lower()

    for category in CATEGORY_ORDER:
        for keyword in CATEGORY_KEYWORDS[category]:
            if any(keyword in part for part in lowered_parts) or keyword in lowered_name:
                return category

    if path.suffix.lower() in {".ico", ".svg"}:
        return "ui"

    return "lore"


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def collect_source_images() -> list[Path]:
    images: list[Path] = []
    seen: set[Path] = set()

    normalized_dirs = {IMAGES_ROOT / category for category in CATEGORY_ORDER}

    for base in SOURCE_DIRS:
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in VALID_EXTENSIONS:
                continue
            if any(parent in normalized_dirs for parent in path.parents):
                continue
            if path in seen:
                continue
            seen.add(path)
            images.append(path)

    return sorted(images)


def collect_asset_references() -> set[str]:
    references: set[str] = set()
    for path in PUBLIC_DIR.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_EXTENSIONS:
            continue
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for match in ASSET_REF_REGEX.findall(content):
            references.add(match.strip())
    return references


def ensure_structure() -> None:
    for category in CATEGORY_ORDER:
        (IMAGES_ROOT / category).mkdir(parents=True, exist_ok=True)


def organize_images() -> tuple[list[AssetEntry], dict[str, list[str]], list[dict[str, object]]]:
    ensure_structure()

    source_images = collect_source_images()
    used_references = collect_asset_references()

    entries: list[AssetEntry] = []
    slug_counters: defaultdict[tuple[str, str], int] = defaultdict(int)
    category_samples: dict[str, list[str]] = {category: [] for category in CATEGORY_ORDER}
    duplicates_by_hash: defaultdict[str, list[str]] = defaultdict(list)

    for source in source_images:
        category = infer_category(source)
        ext = source.suffix.lower()
        base_slug = slugify_filename(source.stem)

        index_key = (category, base_slug)
        slug_counters[index_key] += 1
        ordinal = slug_counters[index_key]
        target_name = f"{base_slug}{ext}" if ordinal == 1 else f"{base_slug}-{ordinal:02d}{ext}"

        target_path = IMAGES_ROOT / category / target_name
        while target_path.exists() and file_hash(target_path) != file_hash(source):
            slug_counters[index_key] += 1
            ordinal = slug_counters[index_key]
            target_name = f"{base_slug}-{ordinal:02d}{ext}"
            target_path = IMAGES_ROOT / category / target_name

        if not target_path.exists():
            shutil.copy2(source, target_path)

        sha = file_hash(target_path)
        source_web = to_web_path(source)
        target_web = to_web_path(target_path)

        entry = AssetEntry(
            source_path=source,
            source_web=source_web,
            target_path=target_path,
            target_web=target_web,
            category=category,
            size_bytes=target_path.stat().st_size,
            sha256=sha,
        )
        entries.append(entry)

        duplicates_by_hash[sha].append(source_web)

        if len(category_samples[category]) < 6:
            category_samples[category].append(target_web)

    duplicate_groups: list[dict[str, object]] = []
    for sha, assets in duplicates_by_hash.items():
        unique_assets = sorted(set(assets))
        if len(unique_assets) < 2:
            continue
        duplicate_groups.append({"hash": sha, "count": len(unique_assets), "assets": unique_assets})

    duplicate_groups.sort(key=lambda item: int(item["count"]), reverse=True)

    used_normalized = {entry for entry in used_references if entry.startswith("/assets/images/")}
    not_referenced = sorted(
        {
            entry.target_web
            for entry in entries
            if entry.target_web not in used_normalized
        }
    )

    audit = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_image_count": len(source_images),
        "normalized_image_count": len(entries),
        "used_asset_references_detected": len(used_references),
        "unreferenced_normalized_images": len(not_referenced),
    }

    MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)
    write_json(
        MANIFESTS_DIR / "normalized-image-map.json",
        {
            **audit,
            "entries": [
                {
                    "source": entry.source_web,
                    "target": entry.target_web,
                    "category": entry.category,
                    "size_bytes": entry.size_bytes,
                }
                for entry in entries
            ],
        },
    )

    write_json(
        MANIFESTS_DIR / "world-of-endcosmos.json",
        {
            "generated_at": audit["generated_at"],
            "title": "World of EndCosmos",
            "categories": [
                {
                    "id": category,
                    "title": category.replace("-", " ").title(),
                    "count": sum(1 for item in entries if item.category == category),
                    "preview": category_samples[category],
                    "items": [item.target_web for item in entries if item.category == category],
                }
                for category in CATEGORY_ORDER
            ],
        },
    )

    build_assets_audit_doc(entries, duplicate_groups, not_referenced)

    return entries, audit, duplicate_groups


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def build_assets_audit_doc(
    entries: list[AssetEntry],
    duplicate_groups: list[dict[str, object]],
    not_referenced: list[str],
) -> None:
    DOCS_DIR.mkdir(parents=True, exist_ok=True)

    by_category = Counter(entry.category for entry in entries)
    total_size_mb = sum(entry.size_bytes for entry in entries) / (1024 * 1024)

    lines: list[str] = []
    lines.append("# EndCosmos Assets Audit")
    lines.append("")
    lines.append(f"Generated: {datetime.now(timezone.utc).isoformat()}")
    lines.append(f"Total normalized images: {len(entries)}")
    lines.append(f"Approx total size: {total_size_mb:.2f} MB")
    lines.append("")
    lines.append("## Category distribution")
    lines.append("")
    for category in CATEGORY_ORDER:
        lines.append(f"- {category}: {by_category.get(category, 0)}")

    lines.append("")
    lines.append("## Duplicate candidates (by SHA-256)")
    lines.append("")
    if not duplicate_groups:
        lines.append("- No duplicates detected.")
    else:
        for group in duplicate_groups[:50]:
            lines.append(f"- {group['count']} files share hash {group['hash'][:12]}...")
            for asset in group["assets"][:8]:
                lines.append(f"  - {asset}")

    lines.append("")
    lines.append("## Unreferenced normalized assets")
    lines.append("")
    if not not_referenced:
        lines.append("- No unreferenced normalized assets detected.")
    else:
        for asset in not_referenced[:300]:
            lines.append(f"- {asset}")
        if len(not_referenced) > 300:
            lines.append(f"- ... and {len(not_referenced) - 300} more")

    (DOCS_DIR / "assets-audit.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    entries, audit, duplicate_groups = organize_images()
    print(f"Normalized images: {len(entries)}")
    print(f"Duplicates groups: {len(duplicate_groups)}")
    print(f"Audit written to: {DOCS_DIR / 'assets-audit.md'}")
    print(f"Map manifest: {MANIFESTS_DIR / 'normalized-image-map.json'}")
    print(f"World index: {MANIFESTS_DIR / 'world-of-endcosmos.json'}")
    print(f"Source images scanned: {audit['source_image_count']}")


if __name__ == "__main__":
    main()
