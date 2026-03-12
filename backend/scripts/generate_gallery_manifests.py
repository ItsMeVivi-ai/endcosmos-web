from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote, unquote


PROJECT_ROOT = Path(__file__).resolve().parents[2]
PUBLIC_ASSETS = PROJECT_ROOT / "public" / "assets"
MANIFESTS_DIR = PUBLIC_ASSETS / "manifests"
ZOGS_DIR = PUBLIC_ASSETS / "zogs"
IMPORTED_ASSETS_DIR = ZOGS_DIR / "imported-assets"
ZOGS_V1_DIR = ZOGS_DIR / "v1"
ZOGS_V2_DIR = ZOGS_DIR / "v2"
ASSETS_IMAGES_DIR = PUBLIC_ASSETS / "images"
NORMALIZED_IMAGE_DIRS = [
    ASSETS_IMAGES_DIR / "hero",
    ASSETS_IMAGES_DIR / "cities",
    ASSETS_IMAGES_DIR / "maps",
    ASSETS_IMAGES_DIR / "npcs",
    ASSETS_IMAGES_DIR / "bosses",
    ASSETS_IMAGES_DIR / "mounts",
    ASSETS_IMAGES_DIR / "pets",
    ASSETS_IMAGES_DIR / "backgrounds",
    ASSETS_IMAGES_DIR / "portals",
    ASSETS_IMAGES_DIR / "ui",
    ASSETS_IMAGES_DIR / "lore",
]
SHORTLIST_PATH = ZOGS_DIR / "catalog" / "endcosmos-web-shortlists.json"

VALID_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"}
NARRATIVE_EXTENSIONS = {".txt", ".md", ".json"}
MAX_NARRATIVE_CHARS = 4000
HOME_TARGET_PROJECT = 24
HOME_TARGET_IMPORTED = 44
HOME_TARGET_V1 = 54
HOME_TARGET_TOTAL = 64
FORMAT_PRIORITY = {
    ".avif": 0,
    ".webp": 1,
    ".jpg": 2,
    ".jpeg": 2,
    ".png": 3,
    ".gif": 4,
}


def natural_key(value: str) -> list[object]:
    parts = re.split(r"(\d+)", value.lower())
    key: list[object] = []
    for part in parts:
        key.append(int(part) if part.isdigit() else part)
    return key


def to_web_path(path: Path) -> str:
    relative = path.relative_to(PUBLIC_ASSETS).as_posix()
    encoded = "/".join(quote(part) for part in relative.split("/"))
    return f"/assets/{encoded}"


def to_alt_from_filename(path: Path) -> str:
    stem = path.stem.replace("_", " ").replace("-", " ")
    stem = re.sub(r"\s+", " ", stem).strip()
    if not stem:
        return "EndCosmos gallery image"
    return stem[:1].upper() + stem[1:]


def display_name_from_filename(path: Path) -> str:
    stem = path.stem.replace("_", " ").replace("-", " ")
    stem = re.sub(r"\s+", " ", stem).strip()
    if not stem:
        return "Untitled Asset"
    words = [word for word in stem.split(" ") if word]
    if not words:
        return "Untitled Asset"
    return " ".join(word if word.isupper() else word.capitalize() for word in words)


def caption_from_name(path: Path) -> str:
    name = path.stem.lower()
    keyword_map = [
        ("portal", "Portal Realms"),
        ("city", "Neo Cities"),
        ("cosmic", "Cosmic Universe"),
        ("nebula", "Nebula Sectors"),
        ("battle", "Cosmic Battles"),
        ("war", "Cosmic Battles"),
        ("map", "Universe Maps"),
        ("dragon", "Mythic Threats"),
        ("boss", "Boss Encounters"),
        ("void", "Void Frontiers"),
        ("realm", "Realm Expeditions"),
    ]
    for keyword, caption in keyword_map:
        if keyword in name:
            return caption
    return "Cosmic Assets"


def score_home_image(path: Path) -> int:
    name = path.stem.lower()
    score = 0
    positive_keywords = {
        "cosmic": 14,
        "nebula": 12,
        "portal": 12,
        "universe": 12,
        "battle": 10,
        "dragon": 10,
        "city": 9,
        "map": 8,
        "realm": 8,
        "void": 8,
    }
    for keyword, weight in positive_keywords.items():
        if keyword in name:
            score += weight

    if "thumb" in name:
        score -= 8
    if "logo" in name:
        score -= 10
    if "npc" in name:
        score += 2

    suffix = path.suffix.lower()
    if suffix in {".jpg", ".jpeg", ".webp"}:
        score += 2

    return score


def shortlist_names() -> list[str]:
    if not SHORTLIST_PATH.exists():
        return []

    try:
        payload = json.loads(SHORTLIST_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []

    names: list[str] = []
    hero_desktop = payload.get("hero_desktop") if isinstance(payload, dict) else None
    if isinstance(hero_desktop, list):
        for item in hero_desktop:
            if isinstance(item, dict):
                name = item.get("name")
                if isinstance(name, str) and name.strip():
                    names.append(name.strip())

    hero_mobile = payload.get("hero_mobile") if isinstance(payload, dict) else None
    if isinstance(hero_mobile, dict):
        name = hero_mobile.get("name")
        if isinstance(name, str) and name.strip():
            names.append(name.strip())

    deduped: list[str] = []
    seen: set[str] = set()
    for name in names:
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(name)
    return deduped


def add_home_slide(slides: list[dict[str, str]], seen: set[str], image: Path, *, caption: str | None = None) -> None:
    if not image.exists() or image.suffix.lower() not in VALID_EXTENSIONS:
        return

    src = to_web_path(image)
    if src in seen:
        return

    seen.add(src)
    slides.append(
        {
            "src": src,
            "alt": to_alt_from_filename(image),
            "caption": caption or caption_from_name(image),
            "subcaption": image.name,
        }
    )


def list_images(folder: Path, *, exclude: set[str] | None = None) -> list[Path]:
    if not folder.exists():
        return []
    blocked = exclude or set()
    files = [
        file
        for file in folder.iterdir()
        if file.is_file() and file.suffix.lower() in VALID_EXTENSIONS and file.name not in blocked
    ]

    best_by_stem: dict[str, Path] = {}
    for file in files:
        stem_key = file.stem.lower()
        current = best_by_stem.get(stem_key)
        if current is None:
            best_by_stem[stem_key] = file
            continue

        current_priority = FORMAT_PRIORITY.get(current.suffix.lower(), 99)
        candidate_priority = FORMAT_PRIORITY.get(file.suffix.lower(), 99)
        if candidate_priority < current_priority:
            best_by_stem[stem_key] = file
        elif candidate_priority == current_priority and natural_key(file.name) < natural_key(current.name):
            best_by_stem[stem_key] = file

    return sorted(best_by_stem.values(), key=lambda path: natural_key(path.name))


def list_images_recursive(folder: Path, *, exclude: set[str] | None = None) -> list[Path]:
    if not folder.exists():
        return []
    blocked = exclude or set()
    files = [
        file
        for file in folder.rglob("*")
        if file.is_file() and file.suffix.lower() in VALID_EXTENSIONS and file.name not in blocked
    ]

    best_by_stem: dict[str, Path] = {}
    for file in files:
        stem_key = file.relative_to(folder).with_suffix("").as_posix().lower()
        current = best_by_stem.get(stem_key)
        if current is None:
            best_by_stem[stem_key] = file
            continue

        current_priority = FORMAT_PRIORITY.get(current.suffix.lower(), 99)
        candidate_priority = FORMAT_PRIORITY.get(file.suffix.lower(), 99)
        if candidate_priority < current_priority:
            best_by_stem[stem_key] = file
        elif candidate_priority == current_priority and natural_key(file.name) < natural_key(current.name):
            best_by_stem[stem_key] = file

    return sorted(best_by_stem.values(), key=lambda path: natural_key(path.relative_to(folder).as_posix()))


def list_narratives(folder: Path) -> list[Path]:
    if not folder.exists():
        return []
    files = [
        file
        for file in folder.iterdir()
        if file.is_file() and file.suffix.lower() in NARRATIVE_EXTENSIONS
    ]
    return sorted(files, key=lambda path: natural_key(path.name))


def narrative_text(path: Path) -> str:
    extension = path.suffix.lower()
    raw = path.read_text(encoding="utf-8", errors="ignore").strip()
    if not raw:
        return ""

    if extension in {".txt", ".md"}:
        return raw[:MAX_NARRATIVE_CHARS]

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return raw

    if isinstance(payload, dict):
        for key in ("summary", "narrative", "text", "description"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()[:MAX_NARRATIVE_CHARS]

    serialized = json.dumps(payload, indent=2, ensure_ascii=False)
    if len(serialized) <= MAX_NARRATIVE_CHARS:
        return serialized
    return f"{serialized[:MAX_NARRATIVE_CHARS]}\n\n...[contenido truncado]"


def build_home_manifest() -> dict:
    imported = sorted(
        list_images(IMPORTED_ASSETS_DIR),
        key=lambda path: (score_home_image(path), natural_key(path.name)),
        reverse=True,
    )
    v1_images = sorted(
        list_images(ZOGS_V1_DIR),
        key=lambda path: (score_home_image(path), natural_key(path.name)),
        reverse=True,
    )
    v2_images = sorted(
        list_images(ZOGS_V2_DIR),
        key=lambda path: (score_home_image(path), natural_key(path.name)),
        reverse=True,
    )
    slides: list[dict[str, str]] = []
    seen_sources: set[str] = set()

    for folder in NORMALIZED_IMAGE_DIRS:
        for image in sorted(
            list_images(folder),
            key=lambda path: (score_home_image(path), natural_key(path.name)),
            reverse=True,
        ):
            if len(slides) >= HOME_TARGET_PROJECT:
                break
            add_home_slide(slides, seen_sources, image, caption="World of EndCosmos")
        if len(slides) >= HOME_TARGET_PROJECT:
            break

    preferred_static = [
        PUBLIC_ASSETS / "hero-main.jpg",
        PUBLIC_ASSETS / "battle.webp",
        PUBLIC_ASSETS / "realm-void.jpg",
        PUBLIC_ASSETS / "realm-ice.jpg",
        PUBLIC_ASSETS / "hero-secondary.jpg",
    ]
    for image in preferred_static:
        add_home_slide(slides, seen_sources, image)

    for file_name in shortlist_names():
        add_home_slide(slides, seen_sources, ASSETS_IMAGES_DIR / file_name)

    project_images = sorted(
        list_images(ASSETS_IMAGES_DIR),
        key=lambda path: (score_home_image(path), natural_key(path.name)),
        reverse=True,
    )
    for image in project_images:
        if len(slides) >= HOME_TARGET_PROJECT:
            break
        add_home_slide(slides, seen_sources, image)

    if imported:
        for image in imported:
            if len(slides) >= HOME_TARGET_IMPORTED:
                break
            add_home_slide(slides, seen_sources, image)

    if v1_images:
        for image in v1_images:
            if len(slides) >= HOME_TARGET_V1:
                break
            add_home_slide(slides, seen_sources, image, caption="ZOGS V1")

    if v2_images:
        for image in v2_images:
            if len(slides) >= HOME_TARGET_TOTAL:
                break
            add_home_slide(slides, seen_sources, image, caption="ZOGS V2")

    if not slides:
        selected = [
            ("realm-ice.jpg", "Frozen cosmic map sector in EndCosmos", "Maps"),
            ("battle.webp", "Boss encounter in EndCosmos universe", "Bosses"),
            ("hero-secondary.jpg", "Futuristic city district under nebula sky", "Cities"),
            ("realm-void.jpg", "Cosmic environment with deep space effects", "Cosmic Environments"),
        ]
        for file_name, alt, caption in selected:
            image = PUBLIC_ASSETS / file_name
            if not image.exists():
                continue
            src = to_web_path(image)
            if src in seen_sources:
                continue
            seen_sources.add(src)
            slides.append({"src": src, "alt": alt, "caption": caption, "subcaption": file_name})

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "slides": slides,
    }


def build_zogs_manifest() -> dict:
    cover_images = [
        path
        for path in list_images(ZOGS_DIR / "catalog")
        if path.stem.lower().startswith("portada")
    ]

    imported_items = [
        {"src": to_web_path(path), "alt": f"Assets: {to_alt_from_filename(path)}"}
        for path in list_images(IMPORTED_ASSETS_DIR)
    ]

    cover_items = [
        {"src": to_web_path(path), "alt": f"Portada: {to_alt_from_filename(path)}"}
        for path in cover_images
    ]

    featured_items = [
        {"src": to_web_path(path), "alt": f"Featured: {to_alt_from_filename(path)}"}
        for path in list_images(ZOGS_DIR)
    ]

    v1_items = [
        {"src": to_web_path(path), "alt": f"ZOGS V1: {to_alt_from_filename(path)}"}
        for path in list_images(ZOGS_DIR / "v1")
    ]

    v2_items = [
        {"src": to_web_path(path), "alt": f"ZOGS V2: {to_alt_from_filename(path)}"}
        for path in list_images(ZOGS_DIR / "v2")
    ]

    catalog_items = [
        {"src": to_web_path(path), "alt": f"Catalog: {to_alt_from_filename(path)}"}
        for path in list_images(ZOGS_DIR / "catalog")
    ]

    narrative_items = [
        {
            "title": path.stem.replace("_", " ").replace("-", " ").strip(),
            "source": path.name,
            "type": path.suffix.lower().lstrip("."),
            "content": narrative_text(path),
        }
        for path in list_narratives(ZOGS_DIR / "catalog")
    ]

    imported_images = list_images(IMPORTED_ASSETS_DIR)
    base_image_path = cover_images[0] if cover_images else None
    if base_image_path is None and imported_images:
        base_image_path = imported_images[0]
    if base_image_path is None:
        base_image_path = ZOGS_DIR / "catalog" / "portada1.png"
    if isinstance(base_image_path, Path) and not base_image_path.exists():
        base_image_path = ZOGS_DIR / "catalog" / "portada1.jpg"

    base_image = {
        "src": to_web_path(base_image_path) if base_image_path.exists() else "",
        "alt": "EndCosmos y sus ideas de lore y movimiento",
    }

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "base_image": base_image,
        "narratives": narrative_items,
        "sections": [
            {"title": "Portadas", "grid_class": "zogs-grid-featured", "items": cover_items},
            {"title": "Assets ZOGS", "grid_class": "zogs-grid-featured", "items": imported_items},
            {"title": "Featured", "grid_class": "zogs-grid-featured", "items": featured_items},
            {"title": "Imagenes V1", "grid_class": "", "items": v1_items},
            {"title": "Imagenes V2", "grid_class": "", "items": v2_items},
            {"title": "Catalog Picks", "grid_class": "zogs-grid-catalog", "items": catalog_items},
        ],
    }


def build_image_data_packages_manifest() -> dict:
    package_sources = [
        ("core-images", "Core Images", ASSETS_IMAGES_DIR),
        ("zogs-imported", "ZOGS Imported", IMPORTED_ASSETS_DIR),
        ("zogs-v1", "ZOGS V1", ZOGS_DIR / "v1"),
        ("zogs-v2", "ZOGS V2", ZOGS_DIR / "v2"),
        ("zogs-catalog", "ZOGS Catalog", ZOGS_DIR / "catalog"),
        ("images-hero", "World Hero", ASSETS_IMAGES_DIR / "hero"),
        ("images-cities", "World Cities", ASSETS_IMAGES_DIR / "cities"),
        ("images-maps", "World Maps", ASSETS_IMAGES_DIR / "maps"),
        ("images-npcs", "World NPCs", ASSETS_IMAGES_DIR / "npcs"),
        ("images-bosses", "World Bosses", ASSETS_IMAGES_DIR / "bosses"),
        ("images-mounts", "World Mounts", ASSETS_IMAGES_DIR / "mounts"),
        ("images-pets", "World Pets", ASSETS_IMAGES_DIR / "pets"),
        ("images-backgrounds", "World Backgrounds", ASSETS_IMAGES_DIR / "backgrounds"),
        ("images-portals", "World Portals", ASSETS_IMAGES_DIR / "portals"),
        ("images-ui", "World UI", ASSETS_IMAGES_DIR / "ui"),
        ("images-lore", "World Lore", ASSETS_IMAGES_DIR / "lore"),
    ]

    packages: list[dict] = []
    total_images = 0

    for package_id, title, directory in package_sources:
        images = list_images(directory) if directory == ASSETS_IMAGES_DIR else list_images_recursive(directory)
        items = [
            {
                "src": to_web_path(path),
                "alt": to_alt_from_filename(path),
                "display_name": display_name_from_filename(path),
                "filename": path.name,
                "caption": caption_from_name(path),
            }
            for path in images
        ]

        total_images += len(items)
        packages.append(
            {
                "id": package_id,
                "title": title,
                "source_dir": f"/assets/{directory.relative_to(PUBLIC_ASSETS).as_posix()}",
                "count": len(items),
                "items": items,
            }
        )

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_packages": len(packages),
        "total_images": total_images,
        "packages": packages,
    }


def infer_visual_bucket(path: Path) -> str:
    name = path.name.lower()
    keyword_buckets = [
        ("hero", ["hero", "portada", "cover", "main"]),
        ("capital-aurelia-prime", ["aurelia", "auroria", "city", "capital"]),
        ("maps-cities", ["map", "mapa", "city", "region", "world"]),
        ("npcs-bosses", ["npc", "boss", "warrior", "guardian", "dragon"]),
        ("cosmic-backgrounds", ["nebula", "cosmic", "space", "universe", "realm", "void"]),
        ("mounts-pets-creatures", ["pet", "mount", "creature", "beast", "serpent", "dragon"]),
        ("portals-libraries", ["portal", "archive", "library", "codex"]),
    ]
    for bucket, keywords in keyword_buckets:
        if any(keyword in name for keyword in keywords):
            return bucket
    return "world-of-endcosmos"


def score_visual_priority(path: Path, bucket: str) -> int:
    name = path.name.lower()
    score = 0

    bucket_keywords = {
        "hero": ["hero", "main", "cover", "cinematic"],
        "capital-aurelia-prime": ["aurelia", "auroria", "capital", "city", "prime"],
        "maps-cities": ["map", "mapa", "city", "world", "region"],
        "npcs-bosses": ["npc", "boss", "guardian", "war", "dragon"],
        "cosmic-backgrounds": ["cosmic", "nebula", "void", "universe", "realm"],
        "mounts-pets-creatures": ["mount", "pet", "creature", "dragon", "beast"],
        "portals-libraries": ["portal", "archive", "library", "codex"],
        "world-of-endcosmos": ["endcosmos", "world", "universe", "map"],
    }
    for keyword in bucket_keywords.get(bucket, []):
        if keyword in name:
            score += 8

    if "thumb" in name:
        score -= 5
    if path.suffix.lower() in {".avif", ".webp"}:
        score += 2
    if path.suffix.lower() in {".jpg", ".jpeg", ".png"}:
        score += 1
    return score


def build_world_visual_manifest() -> dict:
    package_dirs = [ASSETS_IMAGES_DIR, IMPORTED_ASSETS_DIR, ZOGS_V1_DIR, ZOGS_V2_DIR, ZOGS_DIR / "catalog"]
    all_images: list[Path] = []
    for directory in package_dirs:
        all_images.extend(list_images(directory))

    unique_by_src: dict[str, Path] = {}
    for image in all_images:
        unique_by_src[to_web_path(image)] = image
    deduped_images = list(unique_by_src.values())

    bucket_titles = {
        "hero": "Hero principal EndCosmos",
        "capital-aurelia-prime": "Capital Aurelia Prime",
        "maps-cities": "Mapas y ciudades",
        "npcs-bosses": "NPCs y bosses",
        "cosmic-backgrounds": "Fondos cósmicos",
        "mounts-pets-creatures": "Monturas, pets y criaturas",
        "portals-libraries": "Portales y bibliotecas",
        "world-of-endcosmos": "World of EndCosmos",
    }
    bucket_limits = {
        "hero": 10,
        "capital-aurelia-prime": 18,
        "maps-cities": 30,
        "npcs-bosses": 30,
        "cosmic-backgrounds": 30,
        "mounts-pets-creatures": 20,
        "portals-libraries": 20,
        "world-of-endcosmos": 36,
    }

    buckets: dict[str, list[Path]] = {key: [] for key in bucket_titles}
    for image in deduped_images:
        bucket = infer_visual_bucket(image)
        buckets[bucket].append(image)

    categories: list[dict] = []
    total_assigned = 0
    for bucket_key, title in bucket_titles.items():
        ranked = sorted(
            buckets.get(bucket_key, []),
            key=lambda image: (score_visual_priority(image, bucket_key), natural_key(image.name)),
            reverse=True,
        )
        limited = ranked[: bucket_limits.get(bucket_key, 20)]
        items = [
            {
                "src": to_web_path(image),
                "alt": to_alt_from_filename(image),
                "display_name": display_name_from_filename(image),
                "filename": image.name,
                "caption": caption_from_name(image),
            }
            for image in limited
        ]
        total_assigned += len(items)
        categories.append(
            {
                "id": bucket_key,
                "title": title,
                "count": len(items),
                "items": items,
            }
        )

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_categories": len(categories),
        "total_images_assigned": total_assigned,
        "categories": categories,
    }


def build_assets_audit_manifest() -> dict:
    image_roots = [ASSETS_IMAGES_DIR, IMPORTED_ASSETS_DIR, ZOGS_V1_DIR, ZOGS_V2_DIR, ZOGS_DIR / "catalog"]
    all_images: list[Path] = []
    for root in image_roots:
        all_images.extend(list_images(root))

    referenced_files = sorted(
        [
            file
            for file in (PROJECT_ROOT / "public").rglob("*")
            if file.is_file() and file.suffix.lower() in {".html", ".js", ".css"}
        ],
        key=lambda p: natural_key(p.as_posix()),
    )

    reference_regex = re.compile(r"([\"'`])(/assets/[^\"'`\s)]+)\1")
    broken_references: list[dict[str, str]] = []

    for file in referenced_files:
        content = file.read_text(encoding="utf-8", errors="ignore")
        for _, raw_path in reference_regex.findall(content):
            normalized = raw_path.split("?", 1)[0].split("#", 1)[0]
            if not normalized.startswith("/assets/"):
                continue
            relative = unquote(normalized.removeprefix("/assets/"))
            target = PUBLIC_ASSETS / relative
            if target.exists():
                continue
            broken_references.append(
                {
                    "file": file.relative_to(PROJECT_ROOT).as_posix(),
                    "asset": normalized,
                }
            )

    extensions: dict[str, int] = {}
    by_folder: dict[str, int] = {}
    by_category: dict[str, int] = {}

    for image in all_images:
        ext = image.suffix.lower()
        extensions[ext] = extensions.get(ext, 0) + 1

        folder = image.parent.relative_to(PUBLIC_ASSETS).as_posix()
        by_folder[folder] = by_folder.get(folder, 0) + 1

        bucket = infer_visual_bucket(image)
        by_category[bucket] = by_category.get(bucket, 0) + 1

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "totals": {
            "images": len(all_images),
            "folders": len(by_folder),
            "broken_references": len(broken_references),
        },
        "extensions": dict(sorted(extensions.items(), key=lambda item: item[0])),
        "folders": dict(sorted(by_folder.items(), key=lambda item: item[0])),
        "categories": dict(sorted(by_category.items(), key=lambda item: item[0])),
        "broken_references": broken_references,
    }


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def main() -> None:
    home_manifest = build_home_manifest()
    zogs_manifest = build_zogs_manifest()
    image_data_packages = build_image_data_packages_manifest()
    world_visual_manifest = build_world_visual_manifest()
    assets_audit_manifest = build_assets_audit_manifest()

    write_json(MANIFESTS_DIR / "home-gallery.json", home_manifest)
    write_json(MANIFESTS_DIR / "zogs-gallery.json", zogs_manifest)
    write_json(MANIFESTS_DIR / "image-data-packages.json", image_data_packages)
    write_json(MANIFESTS_DIR / "world-visual-pack.json", world_visual_manifest)
    write_json(MANIFESTS_DIR / "assets-audit.json", assets_audit_manifest)

    print(f"Updated: {MANIFESTS_DIR / 'home-gallery.json'}")
    print(f"Updated: {MANIFESTS_DIR / 'zogs-gallery.json'}")
    print(f"Updated: {MANIFESTS_DIR / 'image-data-packages.json'}")
    print(f"Updated: {MANIFESTS_DIR / 'world-visual-pack.json'}")
    print(f"Updated: {MANIFESTS_DIR / 'assets-audit.json'}")


if __name__ == "__main__":
    main()
