from __future__ import annotations

import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
PUBLIC_ASSETS_DIR = PROJECT_ROOT / "public" / "assets"
SYSTEMS_DIR = PROJECT_ROOT / "data" / "cosmos" / "systems"
MAIN_WORLD_FILE = PROJECT_ROOT / "backend" / "data" / "cosmos" / "worlds" / "endcosmos_main_world.json"

OUTPUT_MODEL_FILE = SYSTEMS_DIR / "mapa_global_conectado_modelo_estructural.json"
OUTPUT_IMAGES_FILE = SYSTEMS_DIR / "mapa_global_conectado_imagenes_index.json"
OUTPUT_MATRIX_FILE = SYSTEMS_DIR / "mapa_global_conectado_matriz_imagen_variable.json"

VALID_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".svg"}

TYPE_RULES = {
    "portal": "portal",
    "gate": "portal",
    "rift": "portal",
    "map": "mapa",
    "atlas": "mapa",
    "world": "mundo",
    "planet": "mundo",
    "city": "region",
    "nebula": "region",
    "void": "region",
    "realm": "region",
    "battle": "evento",
    "event": "evento",
    "boss": "evento",
    "npc": "entidad",
    "entity": "entidad",
    "hero": "nucleo_visual",
}


VARIABLE_BY_IMAGE_TYPE = {
    "mapa": {
        "variable_id": "V1",
        "variable_name": "Cobertura cartografica global",
        "subvariable": "Cobertura de regiones principales",
        "indicator": "region_coverage_pct",
    },
    "portal": {
        "variable_id": "V2",
        "variable_name": "Conectividad de portales y rutas",
        "subvariable": "Nodos activos",
        "indicator": "active_nodes",
    },
    "region": {
        "variable_id": "V1",
        "variable_name": "Cobertura cartografica global",
        "subvariable": "Cobertura de regiones principales",
        "indicator": "region_coverage_pct",
    },
    "mundo": {
        "variable_id": "V1",
        "variable_name": "Cobertura cartografica global",
        "subvariable": "Cobertura de capas dimensionales",
        "indicator": "layer_coverage_pct",
    },
    "evento": {
        "variable_id": "V4",
        "variable_name": "Presion de eventos dinamicos",
        "subvariable": "Frecuencia de eventos",
        "indicator": "events_per_cycle",
    },
    "entidad": {
        "variable_id": "V5",
        "variable_name": "Accesibilidad de exploracion",
        "subvariable": "Requisitos de progresion",
        "indicator": "progression_barrier_index",
    },
    "nucleo_visual": {
        "variable_id": "V3",
        "variable_name": "Legibilidad y senaletica del mapa",
        "subvariable": "Contraste de capas",
        "indicator": "label_readability_score",
    },
    "zog": {
        "variable_id": "V3",
        "variable_name": "Legibilidad y senaletica del mapa",
        "subvariable": "Consistencia de iconografia",
        "indicator": "icon_consistency_score",
    },
    "recurso": {
        "variable_id": "V6",
        "variable_name": "Observabilidad del sistema",
        "subvariable": "Cobertura de indicadores",
        "indicator": "instrumented_indicators_pct",
    },
}

DEFAULT_VARIABLE_MAPPING = VARIABLE_BY_IMAGE_TYPE["recurso"]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_json(path: Path, fallback: dict) -> dict:
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def to_web_path(path: Path) -> str:
    relative = path.relative_to(PUBLIC_ASSETS_DIR).as_posix()
    return f"/assets/{relative}"


def detect_type(path: Path) -> str:
    lowered = path.stem.lower()
    for keyword, kind in TYPE_RULES.items():
        if keyword in lowered:
            return kind

    if "zogs/v1" in path.as_posix().lower() or "zogs/v2" in path.as_posix().lower():
        return "zog"

    return "recurso"


def build_image_record(path: Path) -> dict:
    web_path = to_web_path(path)
    source_rel_dir = path.parent.relative_to(PUBLIC_ASSETS_DIR).as_posix()
    size_bytes = path.stat().st_size
    image_type = detect_type(path)
    return {
        "id": hashlib.sha1(web_path.encode("utf-8")).hexdigest()[:16],
        "filename": path.name,
        "web_path": web_path,
        "source_dir": source_rel_dir,
        "extension": path.suffix.lower(),
        "size_bytes": size_bytes,
        "size_kb": round(size_bytes / 1024, 2),
        "image_type": image_type,
    }


def scan_all_images() -> list[dict]:
    files = [
        file
        for file in PUBLIC_ASSETS_DIR.rglob("*")
        if file.is_file() and file.suffix.lower() in VALID_EXTENSIONS
    ]
    files.sort(key=lambda file: file.as_posix().lower())
    return [build_image_record(file) for file in files]


def build_image_variable_matrix(images_payload: dict) -> dict:
    records = images_payload.get("records", [])

    mappings: list[dict] = []
    variable_counter: Counter = Counter()
    image_type_counter: Counter = Counter()

    for record in records:
        image_type = str(record.get("image_type", "recurso")).lower()
        mapping = VARIABLE_BY_IMAGE_TYPE.get(image_type, DEFAULT_VARIABLE_MAPPING)

        row = {
            "image_id": record.get("id"),
            "filename": record.get("filename"),
            "web_path": record.get("web_path"),
            "image_type": image_type,
            "variable_id": mapping["variable_id"],
            "variable_name": mapping["variable_name"],
            "subvariable": mapping["subvariable"],
            "indicator": mapping["indicator"],
            "state_formula_reference": "usar umbrales definidos en modelo_estructural.states",
        }
        mappings.append(row)
        variable_counter[mapping["variable_id"]] += 1
        image_type_counter[image_type] += 1

    summary = {
        "total_images": len(mappings),
        "by_variable": dict(sorted(variable_counter.items(), key=lambda item: item[0])),
        "by_image_type": dict(sorted(image_type_counter.items(), key=lambda item: item[0])),
    }

    return {
        "generated_at": now_iso(),
        "system": "S1",
        "matrix_name": "imagen_variable_subvariable_indicador",
        "summary": summary,
        "rows": mappings,
    }


def build_map_node_root_graph(images_payload: dict, matrix_payload: dict) -> dict:
    records = images_payload.get("records", [])
    matrix_rows = matrix_payload.get("rows", [])

    variable_by_image_id = {
        row.get("image_id"): row.get("variable_id")
        for row in matrix_rows
        if isinstance(row, dict) and row.get("image_id")
    }

    records_by_id = {
        record.get("id"): record
        for record in records
        if isinstance(record, dict) and record.get("id")
    }

    roots = [
        {
            "root_id": "root-cartografia-global",
            "name": "Raíz Cartográfica Global",
            "description": "Núcleo de mapas principales y lectura territorial.",
            "variable_focus": ["V1", "V3"],
        },
        {
            "root_id": "root-portales-rutas",
            "name": "Raíz de Portales y Rutas",
            "description": "Conectividad entre nodos de viaje y transiciones.",
            "variable_focus": ["V2"],
        },
        {
            "root_id": "root-eventos-observabilidad",
            "name": "Raíz de Eventos y Observabilidad",
            "description": "Señales operativas para eventos dinámicos y monitoreo.",
            "variable_focus": ["V4", "V6"],
        },
    ]

    maps = [
        record
        for record in records
        if str(record.get("image_type", "")).lower() in {"mapa", "mundo", "region", "portal"}
    ]

    type_to_root = {
        "mapa": "root-cartografia-global",
        "mundo": "root-cartografia-global",
        "region": "root-cartografia-global",
        "portal": "root-portales-rutas",
    }

    nodes: list[dict] = []
    edges: list[dict] = []
    conscious_image_links: list[dict] = []

    for map_record in maps:
        image_id = map_record.get("id")
        if not image_id:
            continue

        image_type = str(map_record.get("image_type", "mapa")).lower()
        root_id = type_to_root.get(image_type, "root-eventos-observabilidad")
        variable_id = variable_by_image_id.get(image_id, "V6")
        node_id = f"node-{image_id}"

        nodes.append(
            {
                "node_id": node_id,
                "map_id": image_id,
                "map_name": map_record.get("filename", "mapa"),
                "map_type": image_type,
                "root_id": root_id,
                "variable_id": variable_id,
                "primary_image": map_record.get("web_path"),
            }
        )

        edges.append(
            {
                "from": node_id,
                "to": root_id,
                "relation": "anchored_to_root",
            }
        )

        sibling_candidates = [
            record
            for record in records
            if record.get("id") != image_id
            and variable_by_image_id.get(record.get("id"), "V6") == variable_id
        ]

        source_dir = str(map_record.get("source_dir", ""))
        sibling_candidates.sort(
            key=lambda record: (
                0 if str(record.get("source_dir", "")) == source_dir else 1,
                str(record.get("filename", "")).lower(),
            )
        )

        linked_images = [
            {
                "image_id": record.get("id"),
                "web_path": record.get("web_path"),
                "reason": (
                    "misma_variable_y_mismo_origen"
                    if str(record.get("source_dir", "")) == source_dir
                    else "misma_variable_complementaria"
                ),
            }
            for record in sibling_candidates[:3]
            if record.get("id") and record.get("web_path")
        ]

        conscious_image_links.append(
            {
                "map_node": node_id,
                "root_id": root_id,
                "primary_image": map_record.get("web_path"),
                "linked_images": linked_images,
            }
        )

    return {
        "generated_at": now_iso(),
        "roots": roots,
        "nodes": nodes,
        "edges": edges,
        "conscious_image_links": conscious_image_links,
    }


def build_structural_model(images_payload: dict, matrix_payload: dict) -> dict:
    main_world = load_json(MAIN_WORLD_FILE, fallback={})
    regions = main_world.get("regions", []) if isinstance(main_world, dict) else []
    records = images_payload.get("records", [])
    graph_payload = build_map_node_root_graph(images_payload, matrix_payload)

    total_images = images_payload.get("total", len(records))
    type_counter = Counter(record.get("image_type", "recurso") for record in records)

    main_map = "/assets/images/endcosmos-maps-main.png"
    has_main_map = any(record.get("web_path") == main_map for record in records)

    return {
        "generated_at": now_iso(),
        "system": {
            "id": 1,
            "code": "S1",
            "name": "Sistema de mapa global conectado",
            "scope": "Celestial Expanse",
            "primary_map_asset": main_map,
            "primary_map_detected": has_main_map,
            "integration": {
                "web": "/world",
                "api": [
                    "/cosmos/state",
                    "/cosmos/evolve",
                    "/cosmos/systems/mapa-global-conectado",
                ],
            },
        },
        "variables": [
            {
                "id": "V1",
                "name": "Cobertura cartografica global",
                "definition": "Porcentaje del territorio y capas dimensionales representadas en el mapa.",
                "subvariables": [
                    "Cobertura de regiones principales",
                    "Cobertura de capas dimensionales",
                    "Cobertura de rutas entre nodos",
                ],
                "indicators": [
                    "region_coverage_pct",
                    "layer_coverage_pct",
                    "route_coverage_pct",
                ],
                "states": {
                    "critico": "< 40%",
                    "inestable": "40% - 69%",
                    "estable": "70% - 89%",
                    "optimo": ">= 90%",
                },
            },
            {
                "id": "V2",
                "name": "Conectividad de portales y rutas",
                "definition": "Densidad y disponibilidad de enlaces entre regiones, mundos y capas.",
                "subvariables": [
                    "Nodos activos",
                    "Enlaces bidireccionales",
                    "Tiempo medio de transicion",
                ],
                "indicators": [
                    "active_nodes",
                    "bidirectional_links_pct",
                    "avg_transition_seconds",
                ],
                "states": {
                    "critico": "< 45% de enlaces funcionales",
                    "inestable": "45% - 69%",
                    "estable": "70% - 89%",
                    "optimo": ">= 90%",
                },
            },
            {
                "id": "V3",
                "name": "Legibilidad y senaletica del mapa",
                "definition": "Calidad visual y semantica para interpretar nodos, capas y riesgos.",
                "subvariables": [
                    "Contraste de capas",
                    "Consistencia de iconografia",
                    "Claridad de etiquetas",
                ],
                "indicators": [
                    "label_readability_score",
                    "icon_consistency_score",
                    "semantic_noise_ratio",
                ],
                "states": {
                    "critico": "score < 0.45",
                    "inestable": "0.45 - 0.64",
                    "estable": "0.65 - 0.84",
                    "optimo": ">= 0.85",
                },
            },
            {
                "id": "V4",
                "name": "Presion de eventos dinamicos",
                "definition": "Intensidad de eventos globales que modifican rutas, zonas y dificultad.",
                "subvariables": [
                    "Frecuencia de eventos",
                    "Impacto territorial",
                    "Duracion de alteraciones",
                ],
                "indicators": [
                    "events_per_cycle",
                    "territory_affected_pct",
                    "avg_event_duration_min",
                ],
                "states": {
                    "bajo": "< p25 historico",
                    "normal": "p25 - p75",
                    "alto": "> p75",
                    "critico": "> p90",
                },
            },
            {
                "id": "V5",
                "name": "Accesibilidad de exploracion",
                "definition": "Facilidad para descubrir y recorrer contenido sin bloqueos excesivos.",
                "subvariables": [
                    "Rutas abiertas",
                    "Zonas secretas detectables",
                    "Requisitos de progresion",
                ],
                "indicators": [
                    "open_routes_pct",
                    "discoverable_secrets_pct",
                    "progression_barrier_index",
                ],
                "states": {
                    "bloqueado": "indice > 0.75",
                    "friccion": "0.50 - 0.75",
                    "fluido": "0.25 - 0.49",
                    "abierto": "< 0.25",
                },
            },
            {
                "id": "V6",
                "name": "Observabilidad del sistema",
                "definition": "Capacidad de medir y reaccionar al estado del mapa en tiempo de operacion.",
                "subvariables": [
                    "Cobertura de indicadores",
                    "Latencia de actualizacion",
                    "Trazabilidad causal",
                ],
                "indicators": [
                    "instrumented_indicators_pct",
                    "state_refresh_seconds",
                    "causal_trace_completeness",
                ],
                "states": {
                    "ciego": "< 40%",
                    "parcial": "40% - 69%",
                    "suficiente": "70% - 89%",
                    "total": ">= 90%",
                },
            },
        ],
        "causal_relationships": [
            {
                "from": "V2",
                "to": "V1",
                "polarity": "+",
                "strength": "alta",
                "mechanism": "Mayor conectividad incrementa la cobertura efectiva del mapa.",
            },
            {
                "from": "V3",
                "to": "V5",
                "polarity": "+",
                "strength": "alta",
                "mechanism": "Mejor legibilidad reduce friccion en exploracion y descubrimiento.",
            },
            {
                "from": "V4",
                "to": "V2",
                "polarity": "-",
                "strength": "media",
                "mechanism": "Eventos extremos degradan temporalmente rutas y portales.",
            },
            {
                "from": "V4",
                "to": "V5",
                "polarity": "-",
                "strength": "alta",
                "mechanism": "Mayor presion de eventos eleva bloqueos de exploracion.",
            },
            {
                "from": "V6",
                "to": "V2",
                "polarity": "+",
                "strength": "media",
                "mechanism": "Mejor observabilidad permite correccion temprana de enlaces.",
            },
            {
                "from": "V6",
                "to": "V4",
                "polarity": "-",
                "strength": "media",
                "mechanism": "Deteccion temprana amortigua el impacto de eventos dinamicos.",
            },
        ],
        "feedback_loops": [
            {
                "id": "R1",
                "type": "reforzador",
                "path": ["V2", "V1", "V5", "V2"],
                "description": "Mas conectividad mejora cobertura y exploracion, lo que habilita nuevas rutas.",
            },
            {
                "id": "B1",
                "type": "balanceador",
                "path": ["V4", "V5", "V6", "V4"],
                "description": "Mayor presion de eventos reduce exploracion; observabilidad corrige y estabiliza.",
            },
        ],
        "image_access": {
            "index_file": "/data/cosmos/systems/mapa_global_conectado_imagenes_index.json",
            "total_images": total_images,
            "images_by_type": dict(type_counter),
            "folders_indexed": sorted(
                {
                    record.get("source_dir", "")
                    for record in records
                    if isinstance(record.get("source_dir"), str)
                }
            ),
        },
        "world_context": {
            "world_id": main_world.get("world_id", "endcosmos-main-world"),
            "world_name": main_world.get("name", "Celestial Expanse"),
            "regions_total": len(regions),
            "regions": [region.get("name") for region in regions if isinstance(region, dict)],
        },
        "map_node_root_graph": graph_payload,
    }


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def build() -> dict:
    images_payload = {
        "generated_at": now_iso(),
        "assets_root": PUBLIC_ASSETS_DIR.as_posix(),
        "total": 0,
        "records": [],
    }
    images_payload["records"] = scan_all_images()
    images_payload["total"] = len(images_payload["records"])

    matrix_payload = build_image_variable_matrix(images_payload)
    model_payload = build_structural_model(images_payload, matrix_payload)

    write_json(OUTPUT_IMAGES_FILE, images_payload)
    write_json(OUTPUT_MODEL_FILE, model_payload)
    write_json(OUTPUT_MATRIX_FILE, matrix_payload)

    return {
        "images_output": OUTPUT_IMAGES_FILE.as_posix(),
        "model_output": OUTPUT_MODEL_FILE.as_posix(),
        "matrix_output": OUTPUT_MATRIX_FILE.as_posix(),
        "total_images": images_payload["total"],
        "primary_map_detected": model_payload["system"]["primary_map_detected"],
    }


if __name__ == "__main__":
    result = build()
    print(json.dumps(result, indent=2, ensure_ascii=False))
