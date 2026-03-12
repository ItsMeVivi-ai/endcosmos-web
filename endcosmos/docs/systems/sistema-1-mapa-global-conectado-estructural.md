# Sistema 1 — Mapa Global Conectado (Modelo Estructural)

Este documento formaliza el **Sistema de mapa global conectado** como sistema causal operable.

## Archivos generados

- Modelo estructural: `data/cosmos/systems/mapa_global_conectado_modelo_estructural.json`
- Índice completo de imágenes del sistema: `data/cosmos/systems/mapa_global_conectado_imagenes_index.json`
- Matriz imagen → variable/subvariable/indicador: `data/cosmos/systems/mapa_global_conectado_matriz_imagen_variable.json`

## Qué incluye

- Variables y subvariables de control.
- Indicadores medibles por variable.
- Estados por umbrales (crítico, inestable, estable, óptimo).
- Relaciones causales con polaridad e intensidad.
- Bucles de retroalimentación (reforzador y balanceador).
- Contexto del mundo principal (Celestial Expanse) e integración web/API.
- Matriz automática para mapear cada imagen a variable y subvariable del sistema.

## Endpoint API

- `GET /cosmos/systems/mapa-global-conectado`
	- Entrega bundle completo con: `model`, `images_index`, `image_variable_matrix`.

## Uso operativo

1. Ejecuta `python backend/scripts/build_map1_structural_system.py`.
2. Revisa el JSON estructural para iterar los umbrales y causalidad.
3. Usa el índice de imágenes para mapear activos visuales a variables/indicadores.

## Nota

El índice de imágenes recorre **todo `public/assets`** (incluye `images`, `zogs`, `imported-assets`, `v1`, `v2`, etc.) y permite acceso unificado para el sistema.
