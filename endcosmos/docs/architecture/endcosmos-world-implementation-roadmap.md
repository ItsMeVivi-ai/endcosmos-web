# EndCosmos World Implementation Roadmap

Roadmap técnico para implementar los 100 sistemas de EndCosmos sin crear deuda de arquitectura.

## Objetivo

Construir un mundo persistente y escalable con entregas incrementales, validables y compatibles con backend/web existentes.

## Fase 0 — Fundaciones (Semana 1)

- Definir contratos JSON de sistemas (`id`, `name`, `state`, `dependencies`, `owner`).
- Crear registro central de sistemas en `data/cosmos/systems/endcosmos_world_systems.json`.
- Definir telemetría mínima por sistema:
  - `enabled`
  - `uptime`
  - `events_last_24h`
  - `players_affected`

## Fase 1 — Core 6 (Semanas 2–5)

Implementar primero:

1. Mapa global conectado
2. Clima dinámico
3. Bosses globales
4. Eventos globales persistentes
5. Exploración secreta
6. Control territorial

### Entregables de Fase 1

- Endpoints de estado por sistema en API
- Páginas de visualización en web
- Dataset base por sistema
- Trazabilidad de cambios por ciclo

## Fase 2 — Expansión Territorial y Biomas (Semanas 6–10)

- Territorio (11–20)
- Biomas (31–40)
- Clima y entorno extendido (41–50)

### Regla

No abrir nuevos sistemas si métricas de estabilidad de Fase 1 están en rojo.

## Fase 3 — Población Viva del Mundo (Semanas 11–14)

- NPCs del mundo (51–60)
- Bosses del mundo (61–70)
- Recursos (71–80)

### Métricas clave

- Densidad de actividad por región
- Tiempo medio entre eventos
- Saturación de economía por recurso

## Fase 4 — Movimiento + Evolución Global (Semanas 15–20)

- Movimiento (81–90)
- Evolutivos (91–100)

### Control de riesgo

- Feature flags por sistema
- Rollback por región
- Simulación de cargas en eventos globales

## Modelo de dependencia sugerido

- Fundamentales -> Territorio/Exploración/Biomas
- Territorio + Clima -> NPCs + Bosses + Recursos
- Recursos + Territorio -> Economía viva
- Todo lo anterior -> Evolutivos globales

## Gobernanza técnica

- Cada sistema debe tener:
  - Data model
  - API state endpoint
  - UI de observabilidad
  - Test mínimo de smoke

## Núcleo narrativo obligatorio

Todo sistema debe relacionarse con al menos uno de los pilares:

- Aurelia Prime
- Draco
- Llunaris
- Uruk Reborn

## Criterio de éxito

El mundo se considera “vivo” cuando:

- hay cambios observables sin reinicio manual,
- la actividad impacta regiones reales,
- los jugadores perciben consecuencias persistentes,
- el lore y la economía se sincronizan con los eventos.
