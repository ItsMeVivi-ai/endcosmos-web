from __future__ import annotations

from pathlib import Path
import os
import sqlite3
from threading import Lock


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = PROJECT_ROOT / "backend" / "data" / "cosmos" / "endcosmos_internal.db"
INTERNAL_DB_PATH = Path(os.getenv("ENDCOSMOS_INTERNAL_DB", str(DEFAULT_DB_PATH)))

_DB_LOCK = Lock()
_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".avif"}


CLASS_BLUEPRINT = [
    {
        "slug": "astral-knights",
        "name": "Caballeros Astrales",
        "description": "Vanguardia táctica de luz estelar y acero cósmico.",
        "houses": [
            {"slug": "aurelia-wardens", "name": "Casa Aurelia", "lore": "Guardianes de la capital celeste."},
            {"slug": "solar-vanguard", "name": "Casa Solar", "lore": "Escudo del amanecer en primera línea."},
        ],
    },
    {
        "slug": "infernal-legion",
        "name": "Legión Infernal",
        "description": "Maestros del fuego abisal y guerra de asedio.",
        "houses": [
            {"slug": "obsidian-flame", "name": "Casa Obsidiana", "lore": "Forjadores de armaduras ígneas."},
            {"slug": "ember-throne", "name": "Casa Ascua", "lore": "Custodios del Trono de Ceniza."},
        ],
    },
    {
        "slug": "arcane-scholars",
        "name": "Eruditos Arcanos",
        "description": "Control de maná profundo, portales y runas antiguas.",
        "houses": [
            {"slug": "violet-orbit", "name": "Casa Órbita Violeta", "lore": "Arquitectos de torres arcanas."},
            {"slug": "quantum-sigil", "name": "Casa Sigilo Cuántico", "lore": "Investigación de sellos primordiales."},
        ],
    },
    {
        "slug": "draconic-blood",
        "name": "Sangre Dracónica",
        "description": "Poder ancestral ligado a dragones y volcanes vivos.",
        "houses": [
            {"slug": "wyrmcrest", "name": "Casa Wyrmcrest", "lore": "Jinetes de picos dracónicos."},
            {"slug": "molten-claw", "name": "Casa Garra Fundida", "lore": "Cazadores de bestias primordiales."},
        ],
    },
    {
        "slug": "void-weavers",
        "name": "Tejedores del Vacío",
        "description": "Especialistas en sombra, distorsión y ruptura espacial.",
        "houses": [
            {"slug": "night-singularity", "name": "Casa Singularidad", "lore": "Culto a la grieta eterna."},
            {"slug": "abyss-watch", "name": "Casa Abisal", "lore": "Vigías de fronteras prohibidas."},
        ],
    },
]


def _connect() -> sqlite3.Connection:
    INTERNAL_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(INTERNAL_DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def _collect_power_images(limit: int = 120) -> list[str]:
    public_dir = PROJECT_ROOT / "public"
    candidate_dirs = [
        public_dir / "assets" / "images",
        public_dir / "assets" / "zogs" / "imported-assets",
    ]

    files: list[tuple[int, str]] = []
    for folder in candidate_dirs:
        if not folder.exists():
            continue
        for path in folder.iterdir():
            if not path.is_file() or path.suffix.lower() not in _IMAGE_EXTENSIONS:
                continue
            try:
                size = path.stat().st_size
            except OSError:
                continue

            relative = "/" + path.relative_to(public_dir).as_posix()
            files.append((size, relative))

    files.sort(key=lambda item: item[0], reverse=True)

    unique_paths: list[str] = []
    seen: set[str] = set()
    for _, image_path in files:
        if image_path in seen:
            continue
        seen.add(image_path)
        unique_paths.append(image_path)
        if len(unique_paths) >= limit:
            break

    if not unique_paths:
        return ["/assets/images/endcosmos-maps-main.png"]

    return unique_paths


def _collect_all_assets_images(limit: int | None = None) -> list[str]:
    public_dir = PROJECT_ROOT / "public"
    assets_dir = public_dir / "assets"
    if not assets_dir.exists():
        return ["/assets/images/endcosmos-maps-main.png"]

    files: list[tuple[int, str]] = []
    for path in assets_dir.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in _IMAGE_EXTENSIONS:
            continue
        try:
            size = path.stat().st_size
        except OSError:
            continue
        relative = "/" + path.relative_to(public_dir).as_posix()
        files.append((size, relative))

    files.sort(key=lambda item: item[0], reverse=True)

    seen: set[str] = set()
    output: list[str] = []
    for _, image_path in files:
        if image_path in seen:
            continue
        seen.add(image_path)
        output.append(image_path)
        if limit and limit > 0 and len(output) >= limit:
            break

    if not output:
        return ["/assets/images/endcosmos-maps-main.png"]

    return output


def ensure_initialized() -> None:
    with _DB_LOCK:
        connection = _connect()
        try:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS classes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    slug TEXT NOT NULL UNIQUE,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    age_min INTEGER NOT NULL DEFAULT 13,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS houses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    class_id INTEGER NOT NULL,
                    slug TEXT NOT NULL UNIQUE,
                    name TEXT NOT NULL,
                    lore TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS house_images (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    house_id INTEGER NOT NULL,
                    image_path TEXT NOT NULL,
                    title TEXT NOT NULL,
                    power_level INTEGER NOT NULL DEFAULT 1,
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_houses_class_id ON houses(class_id);
                CREATE INDEX IF NOT EXISTS idx_house_images_house_id ON house_images(house_id);
                """
            )

            existing = connection.execute("SELECT COUNT(*) AS count FROM classes").fetchone()["count"]
            if int(existing) > 0:
                connection.commit()
                return

            image_pool = _collect_power_images()
            houses_total = sum(len(item["houses"]) for item in CLASS_BLUEPRINT)
            per_house = max(4, min(10, len(image_pool) // max(1, houses_total)))
            cursor_index = 0

            for cls in CLASS_BLUEPRINT:
                class_cursor = connection.execute(
                    "INSERT INTO classes (slug, name, description, age_min) VALUES (?, ?, ?, ?)",
                    (cls["slug"], cls["name"], cls["description"], 13),
                )
                class_id = int(class_cursor.lastrowid)

                for house in cls["houses"]:
                    house_cursor = connection.execute(
                        "INSERT INTO houses (class_id, slug, name, lore) VALUES (?, ?, ?, ?)",
                        (class_id, house["slug"], house["name"], house["lore"]),
                    )
                    house_id = int(house_cursor.lastrowid)

                    for offset in range(per_house):
                        if not image_pool:
                            break
                        image_path = image_pool[(cursor_index + offset) % len(image_pool)]
                        connection.execute(
                            """
                            INSERT INTO house_images (house_id, image_path, title, power_level, sort_order)
                            VALUES (?, ?, ?, ?, ?)
                            """,
                            (
                                house_id,
                                image_path,
                                f"{house['name']} · Imagen {offset + 1}",
                                7 + ((offset + class_id) % 4),
                                offset,
                            ),
                        )

                    cursor_index += per_house

            connection.commit()
        finally:
            connection.close()


def get_world_tree() -> list[dict]:
    ensure_initialized()

    connection = _connect()
    try:
        class_rows = connection.execute(
            "SELECT id, slug, name, description, age_min FROM classes ORDER BY name ASC"
        ).fetchall()
        house_rows = connection.execute(
            "SELECT id, class_id, slug, name, lore FROM houses ORDER BY name ASC"
        ).fetchall()
        image_rows = connection.execute(
            """
            SELECT id, house_id, image_path, title, power_level, sort_order
            FROM house_images
            ORDER BY house_id ASC, sort_order ASC, id ASC
            """
        ).fetchall()

        images_by_house: dict[int, list[dict]] = {}
        for row in image_rows:
            house_id = int(row["house_id"])
            images_by_house.setdefault(house_id, []).append(
                {
                    "id": int(row["id"]),
                    "path": row["image_path"],
                    "title": row["title"],
                    "power_level": int(row["power_level"]),
                }
            )

        houses_by_class: dict[int, list[dict]] = {}
        for row in house_rows:
            house_id = int(row["id"])
            class_id = int(row["class_id"])
            houses_by_class.setdefault(class_id, []).append(
                {
                    "id": house_id,
                    "slug": row["slug"],
                    "name": row["name"],
                    "lore": row["lore"],
                    "images": images_by_house.get(house_id, []),
                }
            )

        classes: list[dict] = []
        for row in class_rows:
            class_id = int(row["id"])
            houses = houses_by_class.get(class_id, [])
            classes.append(
                {
                    "id": class_id,
                    "slug": row["slug"],
                    "name": row["name"],
                    "description": row["description"],
                    "age_min": int(row["age_min"]),
                    "houses": houses,
                    "total_houses": len(houses),
                    "total_images": sum(len(item["images"]) for item in houses),
                }
            )

        return classes
    finally:
        connection.close()


def add_image_to_house(house_slug: str, image_path: str, title: str, power_level: int = 8) -> dict | None:
    ensure_initialized()

    connection = _connect()
    try:
        house = connection.execute(
            "SELECT id, slug, name FROM houses WHERE slug = ?",
            (house_slug,),
        ).fetchone()
        if not house:
            return None

        next_order = connection.execute(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM house_images WHERE house_id = ?",
            (int(house["id"]),),
        ).fetchone()["next_order"]

        cursor = connection.execute(
            """
            INSERT INTO house_images (house_id, image_path, title, power_level, sort_order)
            VALUES (?, ?, ?, ?, ?)
            """,
            (int(house["id"]), image_path, title, max(1, min(10, int(power_level))), int(next_order)),
        )
        connection.commit()

        return {
            "id": int(cursor.lastrowid),
            "house_slug": house["slug"],
            "house_name": house["name"],
            "path": image_path,
            "title": title,
            "power_level": max(1, min(10, int(power_level))),
        }
    finally:
        connection.close()


def get_repertoire_stats() -> dict:
    ensure_initialized()

    all_assets_images = _collect_all_assets_images()
    connection = _connect()
    try:
        linked_images = int(
            connection.execute("SELECT COUNT(*) AS count FROM house_images").fetchone()["count"]
        )
        houses_count = int(connection.execute("SELECT COUNT(*) AS count FROM houses").fetchone()["count"])
        classes_count = int(connection.execute("SELECT COUNT(*) AS count FROM classes").fetchone()["count"])

        return {
            "assets_images": len(all_assets_images),
            "linked_images": linked_images,
            "classes": classes_count,
            "houses": houses_count,
            "database": str(INTERNAL_DB_PATH),
        }
    finally:
        connection.close()


def sync_full_repertoire(max_images: int | None = None) -> dict:
    ensure_initialized()

    image_pool = _collect_all_assets_images(limit=max_images)

    with _DB_LOCK:
        connection = _connect()
        try:
            house_rows = connection.execute("SELECT id, name FROM houses ORDER BY id ASC").fetchall()
            house_ids = [int(row["id"]) for row in house_rows]

            if not house_ids:
                raise RuntimeError("No houses found for sync")

            connection.execute("DELETE FROM house_images")

            for index, image_path in enumerate(image_pool):
                house_id = house_ids[index % len(house_ids)]
                title = f"Repositorio Total · {Path(image_path).name}"
                power_level = 6 + (index % 5)
                sort_order = index // len(house_ids)
                connection.execute(
                    """
                    INSERT INTO house_images (house_id, image_path, title, power_level, sort_order)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (house_id, image_path, title, power_level, sort_order),
                )

            connection.commit()

            return {
                "synced_images": len(image_pool),
                "houses": len(house_ids),
                "database": str(INTERNAL_DB_PATH),
            }
        finally:
            connection.close()
