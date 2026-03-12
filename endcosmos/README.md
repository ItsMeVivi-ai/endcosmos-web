# EndCosmos Monorepo Scaffold

Estructura base para separar apps, backend, infraestructura, datos y documentación.

## Módulos

- `apps/web`: frontend público
- `apps/admin`: panel administrativo
- `apps/api`: gateway o cliente API
- `backend/services`: servicios de dominio
- `backend/ai`: módulos de IA
- `backend/database`: acceso y migraciones de datos
- `infrastructure/docker`: imágenes y compose
- `infrastructure/nginx`: configuraciones de reverse proxy
- `infrastructure/deploy`: plantillas de despliegue
- `assets/*`: recursos estáticos
- `data/*`: datasets del universo
- `scripts/*`: automatización
- `docs/*`: arquitectura y sistemas
- `workspace/vscode`: configuración de entorno

## Siguiente paso recomendado

1. Definir stack por app (`web`, `admin`, `api`).
2. Crear contratos de datos en `data/`.
3. Publicar guías técnicas en `docs/architecture`.
