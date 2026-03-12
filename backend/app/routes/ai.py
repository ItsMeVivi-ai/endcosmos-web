from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.worldbuilder import filter_assets, generate_world_from_images, load_worldbuilder_state


router = APIRouter(prefix="/ai", tags=["AI World"])


DATA_FILE = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "cosmos"
    / "worlds"
    / "endcosmos_main_world.json"
)

REGIONS_CATALOG_FILE = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "cosmos"
    / "worlds"
    / "endcosmos_regions_50.json"
)

NPCS_CATALOG_FILE = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "cosmos"
    / "worlds"
    / "endcosmos_npcs_100.json"
)


def _load_world_data() -> dict:
    if not DATA_FILE.exists():
        return {
            "world_id": "unavailable",
            "name": "Unavailable",
            "regions": [],
            "principal_npcs": [],
            "discovery_system": {"registry": "Archivo del Cronista"},
            "cosmic_laws": [],
            "thought_system": {"currents": []},
            "universe_layers": [],
        }
    with DATA_FILE.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _load_catalog(path: Path, key: str) -> list[dict]:
    if not path.exists():
        return []

    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    values = payload.get(key, [])
    return values if isinstance(values, list) else []


class NpcDialogueRequest(BaseModel):
    npc: str = Field(min_length=2, max_length=80)
    context: str = Field(min_length=3, max_length=500)
    philosophy: str | None = Field(default=None, max_length=80)


class DiscoveryRequest(BaseModel):
    context: str = Field(min_length=3, max_length=500)
    region: str | None = Field(default=None, max_length=80)
    player_id: str | None = Field(default=None, max_length=80)


class DecisionRequest(BaseModel):
    context: str = Field(min_length=3, max_length=500)
    objective: str | None = Field(default=None, max_length=120)


class WorldBuilderRequest(BaseModel):
    image_folder: str | None = Field(default=None, max_length=500)
    project: str = Field(default="EndCosmos", min_length=2, max_length=120)
    mode: str = Field(default="world_generation", min_length=2, max_length=120)
    website: str = Field(default="https://endcosmos.com", max_length=180)


def _pick_alignment(context: str, world_data: dict) -> str:
    text = context.lower()
    laws = world_data.get("cosmic_laws", [])
    if "artefact" in text or "artifact" in text:
        return laws[1]["name"] if len(laws) > 1 else "Ley de Resonancia"
    if "portal" in text or "map" in text:
        return laws[3]["name"] if len(laws) > 3 else "Ley del Descubrimiento"
    if "void" in text or "vac" in text:
        return laws[4]["name"] if len(laws) > 4 else "Ley del Vacio"
    return laws[0]["name"] if laws else "Ley de Equilibrio"


def _pick_risk(region: str | None) -> Literal["low", "medium", "high", "extreme"]:
    if not region:
        return "medium"

    name = region.lower()
    if "void" in name or "abyss" in name:
        return "extreme"
    if "astral" in name:
        return "high"
    if "ruins" in name:
        return "medium"
    return "low"


@router.get("/world-lore")
def world_lore() -> dict:
    world_data = _load_world_data()
    regions = world_data.get("regions", [])
    npcs = world_data.get("principal_npcs", [])
    expanded_regions = _load_catalog(REGIONS_CATALOG_FILE, "regions")
    expanded_npcs = _load_catalog(NPCS_CATALOG_FILE, "npcs")
    return {
        "success": True,
        "data": {
            "world": world_data,
            "summary": {
                "regions": len(regions),
                "principal_npcs": len(npcs),
                "laws": len(world_data.get("cosmic_laws", [])),
                "layers": len(world_data.get("universe_layers", [])),
                "catalog_regions": len(expanded_regions),
                "catalog_npcs": len(expanded_npcs),
                "hero_image": world_data.get("hero_image"),
            },
        },
    }


@router.get("/world/regions")
def world_regions() -> dict:
    regions = _load_catalog(REGIONS_CATALOG_FILE, "regions")
    return {
        "success": True,
        "data": {
            "total": len(regions),
            "regions": regions,
        },
    }


@router.get("/world/npcs")
def world_npcs() -> dict:
    npcs = _load_catalog(NPCS_CATALOG_FILE, "npcs")
    return {
        "success": True,
        "data": {
            "total": len(npcs),
            "npcs": npcs,
        },
    }


@router.post("/npc/dialogue")
def npc_dialogue(payload: NpcDialogueRequest) -> dict:
    world_data = _load_world_data()
    default_currents = world_data.get("thought_system", {}).get("currents", [])
    chosen_current = payload.philosophy or (default_currents[0] if default_currents else "Orden del Cosmos")

    alignment_law = _pick_alignment(payload.context, world_data)
    guidance = (
        f"{payload.npc} interpreta el evento bajo {chosen_current}. "
        f"El consejo respeta la {alignment_law} y prioriza avance sin romper estabilidad dimensional."
    )

    return {
        "success": True,
        "data": {
            "npc": payload.npc,
            "context": payload.context,
            "philosophy": chosen_current,
            "law_alignment": alignment_law,
            "dialogue": guidance,
        },
    }


@router.post("/discovery")
def discovery(payload: DiscoveryRequest) -> dict:
    world_data = _load_world_data()
    registry = world_data.get("discovery_system", {}).get("registry", "Archivo del Cronista")
    risk = _pick_risk(payload.region)
    alignment_law = _pick_alignment(payload.context, world_data)

    entry_id = f"DISC-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    insight = (
        "Descubrimiento validado en Celestial Expanse; activa rastreo de artefactos y rutas ocultas "
        "para la siguiente fase de exploracion."
    )

    return {
        "success": True,
        "data": {
            "entry_id": entry_id,
            "registry": registry,
            "region": payload.region or "unspecified",
            "risk": risk,
            "law_alignment": alignment_law,
            "insight": insight,
            "player_id": payload.player_id,
        },
    }


@router.post("/decision")
def decision(payload: DecisionRequest) -> dict:
    world_data = _load_world_data()
    alignment_law = _pick_alignment(payload.context, world_data)
    objective = payload.objective or "advance exploration"

    recommendation = {
        "objective": objective,
        "next_action": "scan-region-and-register-artifact",
        "law_alignment": alignment_law,
        "target_registry": world_data.get("discovery_system", {}).get("registry", "Archivo del Cronista"),
    }

    return {
        "success": True,
        "data": recommendation,
    }


@router.post("/worldbuilder")
def worldbuilder(payload: WorldBuilderRequest) -> dict:
    result = generate_world_from_images(
        image_folder=payload.image_folder,
        project=payload.project,
        mode=payload.mode,
        website=payload.website,
    )
    return result


@router.get("/worldbuilder/state")
def worldbuilder_state() -> dict:
    return load_worldbuilder_state()


@router.get("/worldbuilder/assets")
def worldbuilder_assets(asset_type: str | None = None) -> dict:
    return filter_assets(asset_type)
