from __future__ import annotations

import json
import re
import struct
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_IMAGE_FOLDER = PROJECT_ROOT / "public" / "assets" / "zogs"

WORLD_DATA_DIR = PROJECT_ROOT / "data" / "cosmos" / "worldbuilder"
PUBLIC_WORLD_DIR = PROJECT_ROOT / "public" / "assets" / "world"
PUBLIC_NPC_DIR = PROJECT_ROOT / "public" / "assets" / "npc"
PUBLIC_BOSS_DIR = PROJECT_ROOT / "public" / "assets" / "boss"
PUBLIC_MAPS_DIR = PROJECT_ROOT / "public" / "assets" / "maps"
PUBLIC_GENERATED_WORLD_PAGE = PROJECT_ROOT / "public" / "worlds" / "generated" / "index.html"

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"}

ASSET_TYPES = [
    "MAPA",
    "NPC",
    "BOSS",
    "BIOMA",
    "CIUDAD",
    "OBJETO",
    "RAZA",
    "DIMENSION",
    "PORTAL",
    "MONTURA",
    "ARMA",
    "ARTEFACTO",
    "RECURSO",
]

TYPE_KEYWORDS = {
    "MAPA": {"map", "atlas", "carto", "world", "route", "sector"},
    "NPC": {"npc", "citizen", "guardian", "agent", "pilgrim", "merchant", "guide"},
    "BOSS": {"boss", "titan", "overlord", "hydra", "leviathan", "warlord"},
    "BIOMA": {"forest", "desert", "ice", "volcan", "biome", "swamp", "jungle"},
    "CIUDAD": {"city", "capital", "citadel", "station", "metropolis", "district"},
    "OBJETO": {"item", "module", "core", "component", "device", "relic-box"},
    "RAZA": {"race", "tribe", "species", "clan", "bloodline"},
    "DIMENSION": {"dimension", "realm", "void", "plane", "astral", "abyss"},
    "PORTAL": {"portal", "gate", "rift", "wormhole", "jump"},
    "MONTURA": {"mount", "beast", "rider", "drake", "steed"},
    "ARMA": {"weapon", "blade", "rifle", "cannon", "spear", "gun"},
    "ARTEFACTO": {"artifact", "artefact", "sigil", "rune", "orb"},
    "RECURSO": {"resource", "ore", "crystal", "fuel", "essence", "material"},
}


@dataclass
class ImageMeta:
    width: int | None
    height: int | None

    @property
    def ratio(self) -> float | None:
        if not self.width or not self.height:
            return None
        return self.width / self.height


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _slug(text: str) -> str:
    base = re.sub(r"[^a-zA-Z0-9]+", "-", text.strip().lower())
    return re.sub(r"-+", "-", base).strip("-") or "asset"


def _tokens_from_filename(path: Path) -> set[str]:
    text = path.stem.lower().replace("_", " ").replace("-", " ")
    chunks = [part for part in re.split(r"\s+", text) if part]
    return set(chunks)


def _read_png_size(path: Path) -> ImageMeta:
    with path.open("rb") as handle:
        signature = handle.read(8)
        if signature != b"\x89PNG\r\n\x1a\n":
            return ImageMeta(None, None)
        _chunk_len = handle.read(4)
        chunk_type = handle.read(4)
        if chunk_type != b"IHDR":
            return ImageMeta(None, None)
        width = struct.unpack(">I", handle.read(4))[0]
        height = struct.unpack(">I", handle.read(4))[0]
        return ImageMeta(width, height)


def _read_jpeg_size(path: Path) -> ImageMeta:
    with path.open("rb") as handle:
        if handle.read(2) != b"\xff\xd8":
            return ImageMeta(None, None)
        while True:
            marker_prefix = handle.read(1)
            if marker_prefix != b"\xff":
                continue
            marker = handle.read(1)
            while marker == b"\xff":
                marker = handle.read(1)

            if marker in {b"\xd9", b"\xda", b""}:
                break

            segment_len_data = handle.read(2)
            if len(segment_len_data) != 2:
                break
            segment_len = struct.unpack(">H", segment_len_data)[0]

            if marker in {b"\xc0", b"\xc1", b"\xc2", b"\xc3", b"\xc5", b"\xc6", b"\xc7", b"\xc9", b"\xca", b"\xcb", b"\xcd", b"\xce", b"\xcf"}:
                _precision = handle.read(1)
                height = struct.unpack(">H", handle.read(2))[0]
                width = struct.unpack(">H", handle.read(2))[0]
                return ImageMeta(width, height)

            handle.seek(max(segment_len - 2, 0), 1)

    return ImageMeta(None, None)


def _read_webp_size(path: Path) -> ImageMeta:
    with path.open("rb") as handle:
        header = handle.read(30)
    if len(header) < 30 or header[0:4] != b"RIFF" or header[8:12] != b"WEBP":
        return ImageMeta(None, None)

    chunk = header[12:16]
    if chunk == b"VP8X" and len(header) >= 30:
        width = 1 + int.from_bytes(header[24:27], "little")
        height = 1 + int.from_bytes(header[27:30], "little")
        return ImageMeta(width, height)

    return ImageMeta(None, None)


def _image_meta(path: Path) -> ImageMeta:
    suffix = path.suffix.lower()
    try:
        if suffix == ".png":
            return _read_png_size(path)
        if suffix in {".jpg", ".jpeg"}:
            return _read_jpeg_size(path)
        if suffix == ".webp":
            return _read_webp_size(path)
    except (OSError, struct.error, ValueError):
        return ImageMeta(None, None)

    return ImageMeta(None, None)


def _classify(tokens: set[str], meta: ImageMeta) -> str:
    score: Counter[str] = Counter()
    for asset_type, keywords in TYPE_KEYWORDS.items():
        score[asset_type] = len(tokens.intersection(keywords))

    if meta.ratio is not None:
        if meta.ratio > 1.55:
            score["MAPA"] += 1
            score["DIMENSION"] += 1
        if meta.ratio < 0.85:
            score["NPC"] += 1
            score["BOSS"] += 1

    best = score.most_common(1)
    if best and best[0][1] > 0:
        return best[0][0]

    if meta.ratio is not None and meta.ratio > 1.65:
        return "MAPA"
    return "ARTEFACTO"


def _description(name: str, asset_type: str, meta: ImageMeta) -> str:
    size = "resolución desconocida"
    if meta.width and meta.height:
        size = f"{meta.width}x{meta.height}"
    return f"{name} se interpreta como {asset_type.lower()} con lectura visual de {size}."


def _lore(name: str, asset_type: str) -> str:
    return (
        f"{name} emerge del Archivo ZOGS como nodo de memoria activa. "
        f"En EndCosmos, este {asset_type.lower()} conecta civilizaciones, conflictos y rutas de expansión interdimensional."
    )


def _gameplay(asset_type: str) -> str:
    gameplay = {
        "MAPA": "Desbloquea zonas, rutas rápidas y eventos dinámicos de territorio.",
        "NPC": "Activa diálogo, reputación, comercio y cadenas de misiones.",
        "BOSS": "Encuentro de raid con mecánicas de fases, control de área y recompensas únicas.",
        "BIOMA": "Define clima, recursos, fauna hostil y modificadores de exploración.",
        "CIUDAD": "Centro social, crafting, mercado y progresión de facciones.",
        "OBJETO": "Consumible o módulo utilitario para builds y sinergias.",
        "RAZA": "Origen cultural con bonuses, pasivas y árbol narrativo.",
        "DIMENSION": "Región avanzada con reglas físicas y drops especiales.",
        "PORTAL": "Conector entre mundos y contenido temporal escalable.",
        "MONTURA": "Movilidad y ventaja táctica con estadísticas de travesía.",
        "ARMA": "Equipo ofensivo con afinidades elementales y progresión de rareza.",
        "ARTEFACTO": "Pieza legendaria para activar efectos de metajuego.",
        "RECURSO": "Materia prima para economía, alquimia y profesiones.",
    }
    return gameplay.get(asset_type, "Elemento integrable al metajuego expansible de EndCosmos.")


def _missions(name: str, asset_type: str) -> list[str]:
    return [
        f"Investigar anomalía de {name}",
        f"Asegurar control estratégico del {asset_type.lower()}",
        f"Sincronizar datos del nodo con el Codex central",
    ]


def _enemies(asset_type: str) -> list[str]:
    base = {
        "MAPA": ["Exploradores Hostiles", "Cartógrafos Corruptos"],
        "NPC": ["Suplantadores Cuánticos", "Mercenarios del Vacío"],
        "BOSS": ["Legión Abisal", "Ecos Titanes"],
        "BIOMA": ["Fauna Mutada", "Parásitos Dimensionales"],
        "CIUDAD": ["Sindicatos Sombra", "Saboteadores"],
    }
    return base.get(asset_type, ["Entidades Errantes", "Anomalías del Vacío"])


def _rewards(asset_type: str) -> list[str]:
    rewards = {
        "MAPA": ["Fragmento de Cartografía", "Acceso a ruta oculta"],
        "NPC": ["Reputación de Facción", "Contrato exclusivo"],
        "BOSS": ["Núcleo Legendario", "Arma mítica"],
        "BIOMA": ["Recursos raros", "Receta de alquimia"],
        "CIUDAD": ["Permiso comercial", "Plano de construcción"],
    }
    return rewards.get(asset_type, ["Créditos cósmicos", "Material avanzado"])


def _recommended_level(asset_type: str) -> str:
    levels = {
        "MAPA": "10-25",
        "NPC": "1-60",
        "BOSS": "45-80",
        "BIOMA": "20-50",
        "CIUDAD": "5-40",
        "DIMENSION": "55-90",
        "PORTAL": "30-70",
    }
    return levels.get(asset_type, "15-55")


def _asset_route(asset_type: str, file_name: str) -> str:
    slug = _slug(Path(file_name).stem)
    if asset_type == "MAPA":
        return f"/assets/maps/{slug}.json"
    if asset_type == "NPC":
        return f"/assets/npc/{slug}.json"
    if asset_type == "BOSS":
        return f"/assets/boss/{slug}.json"
    return f"/assets/world/{slug}.json"


def _map_relations(assets: list[dict]) -> None:
    map_names = [item["nombre"] for item in assets if item["tipo"] == "MAPA"]
    default_map = map_names[0] if map_names else "Sector Prime"
    for item in assets:
        item["mapa_relacionado"] = item["nombre"] if item["tipo"] == "MAPA" else default_map


def _write_json(path: Path, payload: dict | list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def _render_html(assets: list[dict], project: str) -> str:
    cards: list[str] = []
    for item in assets:
        cards.append(
            """
            <article class=\"card\"> 
              <h3>{nombre}</h3>
              <p><strong>Tipo:</strong> {tipo}</p>
              <p>{descripcion}</p>
              <p><strong>Función:</strong> {funcion}</p>
              <p><strong>Nivel:</strong> {nivel}</p>
              <p><strong>Mapa:</strong> {mapa}</p>
            </article>
            """.format(
                nombre=item["nombre"],
                tipo=item["tipo"],
                descripcion=item["descripcion"],
                funcion=item["funcion_en_el_juego"],
                nivel=item["nivel_recomendado"],
                mapa=item["mapa_relacionado"],
            )
        )

    return f"""<!doctype html>
<html lang=\"es\">
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>{project} | Worldbuilder DNA</title>
    <style>
      body {{ margin:0; font-family:Segoe UI,sans-serif; background:#060a16; color:#eef3ff; }}
      main {{ width:min(1400px,92vw); margin:0 auto; padding:1.2rem 0 2rem; }}
      h1 {{ margin:.4rem 0 1rem; }}
      .grid {{ display:grid; gap:.9rem; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); }}
      .card {{ border:1px solid rgba(122,158,255,.35); border-radius:14px; padding:.85rem; background:rgba(9,15,34,.78); }}
      .card h3 {{ margin:.2rem 0 .4rem; }}
      p {{ margin:.35rem 0; }}
    </style>
  </head>
  <body>
    <main>
      <p>Generado automáticamente desde imágenes ZOGS.</p>
      <h1>{project} · ADN del universo</h1>
      <section class=\"grid\">{''.join(cards)}</section>
    </main>
  </body>
</html>
"""


def _systems_payload(assets: list[dict]) -> dict:
    return {
        "generated_at": _now_iso(),
        "systems": {
            "sistema_de_civilizaciones": "Facciones emergen por tipo RAZA/CIUDAD y relación de NPC.",
            "sistema_de_economia": "RECURSO + OBJETO + ARTEFACTO alimentan mercado y crafting.",
            "sistema_de_portales": "PORTAL conecta mapas y dimensiones con eventos rotativos.",
            "sistema_de_dimensiones": "DIMENSION define reglas avanzadas y riesgo alto.",
            "sistema_de_alquimia": "Combinación de RECURSO y ARTEFACTO para buffs y progresión.",
            "sistema_de_monturas": "MONTURA habilita rutas especiales y movilidad táctica.",
            "sistema_de_profesiones": "Especializaciones por cadena de misiones y economía.",
            "sistema_de_reinos": "CIUDAD y MAPA soportan control territorial por civilizaciones.",
            "sistema_de_boss_mundiales": "BOSS globales escalan por fase y actividad del servidor.",
        },
        "universe_flags": {
            "infinito": True,
            "multidimensional": True,
            "evolutivo": True,
            "expansible": True,
        },
        "total_assets": len(assets),
    }


def generate_world_from_images(image_folder: str | None, project: str, mode: str, website: str) -> dict:
    folder = Path(image_folder).expanduser() if image_folder else DEFAULT_IMAGE_FOLDER
    if not folder.exists() or not folder.is_dir():
        raise FileNotFoundError(f"Image folder not found: {folder}")

    files = [p for p in folder.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS]
    files.sort(key=lambda p: p.as_posix().lower())

    assets: list[dict] = []
    for path in files:
        tokens = _tokens_from_filename(path)
        meta = _image_meta(path)
        asset_type = _classify(tokens, meta)
        asset_name = path.stem.replace("_", " ").replace("-", " ").strip().title()
        missions = _missions(asset_name, asset_type)
        enemies = _enemies(asset_type)
        rewards = _rewards(asset_type)

        assets.append(
            {
                "nombre": asset_name,
                "tipo": asset_type,
                "descripcion": _description(asset_name, asset_type, meta),
                "lore": _lore(asset_name, asset_type),
                "funcion_en_el_juego": _gameplay(asset_type),
                "npc_relacionados": [f"Operador {asset_name}", "Archivista Dimensional"],
                "misiones": missions,
                "enemigos": enemies,
                "recompensas": rewards,
                "nivel_recomendado": _recommended_level(asset_type),
                "mapa_relacionado": "",
                "source_image": path.as_posix(),
                "route": _asset_route(asset_type, path.name),
            }
        )

    _map_relations(assets)

    systems_payload = _systems_payload(assets)
    registry_payload = {
        "generated_at": _now_iso(),
        "project": project,
        "mode": mode,
        "website": website,
        "image_folder": folder.as_posix(),
        "total_images": len(files),
        "total_assets": len(assets),
        "assets": assets,
        "systems": systems_payload["systems"],
    }

    WORLD_DATA_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_WORLD_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_NPC_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_BOSS_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_MAPS_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_GENERATED_WORLD_PAGE.parent.mkdir(parents=True, exist_ok=True)

    _write_json(WORLD_DATA_DIR / "worldbuilder-registry.json", registry_payload)
    _write_json(PUBLIC_WORLD_DIR / "worldbuilder-assets.json", registry_payload)
    _write_json(PUBLIC_WORLD_DIR / "world-systems.json", systems_payload)

    npc_assets = [item for item in assets if item["tipo"] in {"NPC", "RAZA", "MONTURA"}]
    boss_assets = [item for item in assets if item["tipo"] == "BOSS"]
    map_assets = [item for item in assets if item["tipo"] in {"MAPA", "BIOMA", "CIUDAD", "PORTAL", "DIMENSION"}]

    _write_json(PUBLIC_NPC_DIR / "npc-assets.json", {"generated_at": _now_iso(), "items": npc_assets})
    _write_json(PUBLIC_BOSS_DIR / "boss-assets.json", {"generated_at": _now_iso(), "items": boss_assets})
    _write_json(PUBLIC_MAPS_DIR / "map-assets.json", {"generated_at": _now_iso(), "items": map_assets})

    PUBLIC_GENERATED_WORLD_PAGE.write_text(_render_html(assets, project), encoding="utf-8")

    return {
        "success": True,
        "project": project,
        "mode": mode,
        "website": website,
        "image_folder": folder.as_posix(),
        "total_images": len(files),
        "total_assets": len(assets),
        "outputs": {
            "registry": (WORLD_DATA_DIR / "worldbuilder-registry.json").as_posix(),
            "world_assets": (PUBLIC_WORLD_DIR / "worldbuilder-assets.json").as_posix(),
            "npc_assets": (PUBLIC_NPC_DIR / "npc-assets.json").as_posix(),
            "boss_assets": (PUBLIC_BOSS_DIR / "boss-assets.json").as_posix(),
            "map_assets": (PUBLIC_MAPS_DIR / "map-assets.json").as_posix(),
            "systems": (PUBLIC_WORLD_DIR / "world-systems.json").as_posix(),
            "html": PUBLIC_GENERATED_WORLD_PAGE.as_posix(),
        },
    }


def load_worldbuilder_state() -> dict:
    registry = WORLD_DATA_DIR / "worldbuilder-registry.json"
    if not registry.exists():
        return {
            "success": False,
            "message": "Worldbuilder data not generated yet",
            "assets": [],
            "systems": {},
        }
    data = json.loads(registry.read_text(encoding="utf-8"))
    return {"success": True, "data": data}


def filter_assets(asset_type: str | None = None) -> dict:
    state = load_worldbuilder_state()
    if not state.get("success"):
        return state

    data = state["data"]
    items = data.get("assets", [])
    if asset_type:
        normalized = asset_type.upper().strip()
        items = [item for item in items if item.get("tipo") == normalized]

    return {
        "success": True,
        "total": len(items),
        "items": items,
    }
