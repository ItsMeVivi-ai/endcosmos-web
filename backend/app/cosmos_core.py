from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
PUBLIC_IMAGES_ROOT = PROJECT_ROOT / "public" / "assets" / "images"
COSMOS_DATA_DIR = PROJECT_ROOT / "backend" / "data" / "cosmos"
IMAGE_INDEX_FILE = COSMOS_DATA_DIR / "image_index.json"
UNIVERSE_FILE = COSMOS_DATA_DIR / "universe_structure.json"
WORLDS_DIR = COSMOS_DATA_DIR / "worlds"
VYRAKTH_WORLD_FILE = WORLDS_DIR / "vyrakth_infinity.json"
SYSTEMS_DIR = PROJECT_ROOT / "data" / "cosmos" / "systems"
MAP1_MODEL_FILE = SYSTEMS_DIR / "mapa_global_conectado_modelo_estructural.json"
MAP1_IMAGES_FILE = SYSTEMS_DIR / "mapa_global_conectado_imagenes_index.json"
MAP1_MATRIX_FILE = SYSTEMS_DIR / "mapa_global_conectado_matriz_imagen_variable.json"


CLASSIFICATION_RULES = {
    "portal": "portal_dimensional",
    "gate": "portal_dimensional",
    "rift": "portal_dimensional",
    "npc": "entidad",
    "entity": "entidad",
    "character": "entidad",
    "planeta": "mundo",
    "planet": "mundo",
    "world": "mundo",
    "ciudad": "mapa",
    "city": "mapa",
    "map": "mapa",
    "evento": "evento",
    "event": "evento",
}


PURPOSE_BY_TYPE = {
    "portal_dimensional": "Conecta dimensiones y rutas de viaje.",
    "entidad": "Define NPCs, facciones o guardianes del cosmos.",
    "mundo": "Crea un mundo explorable dentro del universo.",
    "mapa": "Define mapa urbano o zona estratégica.",
    "evento": "Activa una narrativa dinámica del cosmos.",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_read_json(path: Path, fallback: dict) -> dict:
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def _detect_type(image_name: str) -> str:
    lowered = image_name.lower()
    for keyword, image_type in CLASSIFICATION_RULES.items():
        if keyword in lowered:
            return image_type
    return "evento"


def _embedding_vector(seed_text: str, dimensions: int = 16) -> list[float]:
    digest = hashlib.sha256(seed_text.encode("utf-8")).digest()
    vector: list[float] = []
    for i in range(dimensions):
        byte = digest[i % len(digest)]
        vector.append(round(byte / 255.0, 6))
    return vector


def _build_image_record(path: Path, root: Path) -> dict:
    relative = path.relative_to(root).as_posix()
    image_type = _detect_type(path.stem)
    return {
        "id": hashlib.sha1(relative.encode("utf-8")).hexdigest()[:16],
        "name": path.name,
        "path": relative,
        "image_type": image_type,
        "purpose": PURPOSE_BY_TYPE[image_type],
        "embedding": _embedding_vector(f"{path.stem}:{image_type}:{relative}"),
    }


def scan_images(images_root: Path | None = None) -> dict:
    root = images_root or PUBLIC_IMAGES_ROOT
    if not root.exists():
        payload = {
            "generated_at": _now_iso(),
            "images_root": root.as_posix(),
            "total": 0,
            "records": [],
        }
        _write_json(IMAGE_INDEX_FILE, payload)
        return payload

    patterns = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
    files = [
        file
        for file in root.rglob("*")
        if file.is_file() and file.suffix.lower() in patterns
    ]
    records = [_build_image_record(file, root) for file in sorted(files)]
    payload = {
        "generated_at": _now_iso(),
        "images_root": root.as_posix(),
        "total": len(records),
        "records": records,
    }
    _write_json(IMAGE_INDEX_FILE, payload)
    return payload


def _group_records(records: list[dict], image_type: str) -> list[dict]:
    return [record for record in records if record["image_type"] == image_type]


def _load_worlds() -> list[dict]:
    if not WORLDS_DIR.exists():
        return []
    worlds: list[dict] = []
    for world_file in sorted(WORLDS_DIR.glob("*.json")):
        worlds.append(_safe_read_json(world_file, fallback={}))
    return [world for world in worlds if world]


def materialize_vyrakth() -> dict:
    world = _safe_read_json(VYRAKTH_WORLD_FILE, fallback={})
    if not world:
        raise FileNotFoundError("VYRAKTH world file was not found")
    world["materialized_at"] = _now_iso()
    world["materialized_by"] = "END COSMOS CORE"
    _write_json(VYRAKTH_WORLD_FILE, world)
    return world


def interpret_and_generate(index_payload: dict | None = None) -> dict:
    index = index_payload or _safe_read_json(IMAGE_INDEX_FILE, fallback={"records": [], "total": 0})
    records = index.get("records", [])
    worlds_registry = _load_worlds()

    worlds = _group_records(records, "mundo")
    entities = _group_records(records, "entidad")
    portals = _group_records(records, "portal_dimensional")
    maps = _group_records(records, "mapa")
    events = _group_records(records, "evento")

    systems = {
        "world_generator": [item["id"] for item in worlds],
        "entity_registry": [item["id"] for item in entities],
        "portal_network": [item["id"] for item in portals],
        "map_forge": [item["id"] for item in maps],
        "event_orchestrator": [item["id"] for item in events],
    }

    universe = {
        "generated_at": _now_iso(),
        "summary": {
            "total_images": len(records),
            "worlds": len(worlds),
            "codex_worlds": len(worlds_registry),
            "entities": len(entities),
            "portals": len(portals),
            "maps": len(maps),
            "events": len(events),
        },
        "systems": systems,
        "world_codex": {
            "total": len(worlds_registry),
            "ids": [world.get("world_id", "unknown") for world in worlds_registry],
        },
        "interpretation": {
            "rule_1": "Cada imagen fue asignada a un sistema del universo.",
            "rule_2": "Ninguna imagen queda sin propósito.",
            "rule_3": "Tipos detectados: mapa, entidad, evento, mundo, portal dimensional.",
            "rule_4": "Se reorganiza automáticamente por clasificación semántica.",
            "rule_5": "Recursos sin match explícito se integran como eventos narrativos.",
            "rule_6": "Los mundos canónicos viven en el Codex y evolucionan sin destruir el núcleo.",
        },
    }
    _write_json(UNIVERSE_FILE, universe)
    return universe


def get_current_state() -> dict:
    index = _safe_read_json(IMAGE_INDEX_FILE, fallback={"records": [], "total": 0})
    universe = _safe_read_json(UNIVERSE_FILE, fallback={"summary": {"total_images": 0}})
    worlds = _load_worlds()
    return {"index": index, "universe": universe, "worlds": worlds}


def get_map1_structural_bundle() -> dict:
    model = _safe_read_json(MAP1_MODEL_FILE, fallback={})
    images = _safe_read_json(MAP1_IMAGES_FILE, fallback={"total": 0, "records": []})
    matrix = _safe_read_json(MAP1_MATRIX_FILE, fallback={"summary": {"total_images": 0}, "rows": []})

    return {
        "system": "S1",
        "model": model,
        "images_index": images,
        "image_variable_matrix": matrix,
    }
