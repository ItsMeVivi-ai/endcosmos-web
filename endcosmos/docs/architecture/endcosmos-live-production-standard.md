# EndCosmos Live Production Standard

## Vision (Operational Form)

EndCosmos se opera como **sistema vivo** y no como escena estática.

- Mundo persistente: el estado evoluciona aunque el jugador no observe una zona.
- Producción sin errores: ningún deploy válido con rutas rotas, manifiestos inválidos o scripts con fallos.
- Escala cinematográfica ligada al sistema: visuales y movimiento responden a estado real del mundo.

## Enforceable Quality Gates

Todos los cambios deben pasar `scripts/validate-live-production.ps1`.

### Gate 1 — Integridad de manifesos

Se valida existencia, JSON válido y contenido mínimo de:

- `home-gallery.json`
- `zogs-gallery.json`
- `image-data-packages.json`
- `world-systems.json`
- `endcosmos-images-workspace.json`

### Gate 2 — Conectividad real de manifiestos

Se exige solapamiento entre:

- `home-gallery.json` ↔ `endcosmos-images-workspace.json`
- `zogs-gallery.json` ↔ `endcosmos-images-workspace.json`

Objetivo: evitar manifiestos huérfanos o desconectados de la librería viva.

### Gate 3 — Backend sintácticamente limpio

Compilación mínima obligatoria:

- `backend/app/main.py`
- `backend/app/auth.py`
- `backend/app/cosmos_core.py`
- `backend/app/routes/cosmos.py`
- `backend/scripts/generate_gallery_manifests.py`
- `backend/scripts/build_map1_structural_system.py`

### Gate 4 — Frontend crítico sintácticamente limpio

Validación de JS crítico de experiencia, mundo y administración.

## World Simulation Contracts (Core)

### Contract A — World topology is data-driven

- El mapa y sistemas del mundo se consumen desde manifiestos/datasets (`world-systems.json`, sistemas S1, etc.).
- Cualquier cambio de estructura del mundo debe reflejarse en datos, no hardcode aislado.

### Contract B — NPC life beyond frame

- Los NPCs se modelan como entidades con estado (memoria/rol/progresión) y continuidad fuera de cámara.
- Las rutas de IA y sistema deben mantener trazabilidad por datos y/o endpoint de estado.

### Contract C — Causal observability

- Cada sistema nuevo debe mapear variables, indicadores y relaciones causales.
- Referencia actual: `sistema-1-mapa-global-conectado-estructural.md` y matriz imagen-variable.

### Contract D — No silent failure in production

- Cualquier falla de validación bloquea flujo de commit/deploy automático.
- Sin bypass por defecto en pipelines de validación local.

## Release Checklist (No Rollback Culture)

1. Ejecutar `scripts/validate-live-production.ps1`.
2. Ejecutar validación completa de web (`Web: Validate all`) si el cambio toca assets/manifiestos/scripts.
3. Verificar rutas críticas del mundo (`/`, `/world`, `/zogs`, `/news`, `/admin/dev`).
4. Confirmar que los manifiestos siguen conectados y no decrementan cobertura sin justificación.
5. Solo después: commit/deploy.

## Continuous Flow Integration

Este estándar se integra en:

- `scripts/auto-commit.ps1` (modo validate-only y pre-commit).
- Tarea VS Code dedicada para validación de producción viva.

## KPI Baseline (Starter)

- `manifest_connectivity_ratio = connected_manifests / total_manifests` (objetivo: 1.0)
- `frontend_syntax_pass = true`
- `backend_syntax_pass = true`
- `world_manifest_items > 0`
- `npc/world system state endpoints available`

Este documento es contrato operativo: no es solo visión, es criterio de aceptación para publicar EndCosmos.
