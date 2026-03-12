from fastapi import APIRouter

from app.cosmos_core import (
    get_map1_structural_bundle,
    get_current_state,
    interpret_and_generate,
    materialize_vyrakth,
    scan_images,
)


router = APIRouter(prefix="/cosmos", tags=["EndCosmos Core"])


@router.get("/health")
def cosmos_health() -> dict:
    return {
        "success": True,
        "core": "END COSMOS CORE",
        "status": "active",
        "pipeline": ["image_index", "ai_interpreter", "world_generator"],
    }


@router.post("/rebuild-index")
def rebuild_index() -> dict:
    index = scan_images()
    return {
        "success": True,
        "message": "Image index rebuilt",
        "total_images": index["total"],
    }


@router.post("/evolve")
def evolve_cosmos() -> dict:
    index = scan_images()
    universe = interpret_and_generate(index)
    return {
        "success": True,
        "message": "Cosmos evolved",
        "summary": universe["summary"],
    }


@router.get("/state")
def cosmos_state() -> dict:
    return {
        "success": True,
        "data": get_current_state(),
    }


@router.get("/systems/mapa-global-conectado")
def cosmos_mapa_global_conectado() -> dict:
    return {
        "success": True,
        "data": get_map1_structural_bundle(),
    }


@router.post("/worlds/vyrakth/materialize")
def materialize_vyrakth_world() -> dict:
    world = materialize_vyrakth()
    return {
        "success": True,
        "message": "VYRAKTH ∞ materialized",
        "world": world,
    }
