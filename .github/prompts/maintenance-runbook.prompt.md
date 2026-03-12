---
name: maintenance-runbook
description: "Run EndCosmos web maintenance with backup-first rules: detect duplicates, reorganize structure, optimize assets, replace obsolete components, and report performance impact."
argument-hint: "Provide target scope, replacements map, and performance goals"
---

Ejecuta una corrida completa de mantenimiento web para EndCosmos usando este contexto:

- Scope objetivo: {{TARGET_SCOPE}}
- Mapa de reemplazos (old->new): {{REPLACEMENT_MAP}}
- Objetivos de performance (peso/SEO/velocidad/accesibilidad): {{PERFORMANCE_GOALS}}
- Restricciones extra (opcional): {{EXTRA_CONSTRAINTS}}

Instrucciones de ejecución:

1. Detecta contenido duplicado en el scope indicado.
2. Propón y aplica reorganización de carpetas de forma segura.
3. Optimiza assets (compresión y lazy loading cuando aplique).
4. Reemplaza componentes obsoletos según el mapa de reemplazos.
5. Mantén coherencia estructural y rutas públicas estables.
6. Evalúa impacto en peso de página, SEO, velocidad y accesibilidad.

Reglas obligatorias:

- Nunca eliminar contenido sin backup previo.
- Si un reemplazo no está definido, proponer opciones y pedir aprobación.
- Integración CDN: solo recomendaciones en el reporte (no aplicar cambios automáticamente).
- Mantener cambios mínimos y reversibles.

Formato de salida obligatorio:
MAINTENANCE REPORT

Files Reorganized
Assets Replaced
Performance Improvements
Structure Optimized

Incluye además:

- Backups creados
- Riesgos detectados
- Próximos pasos sugeridos
