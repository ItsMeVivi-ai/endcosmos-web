# EndCosmos Admin MVP (External Control Plane)

MVP funcional en Python para operar EndCosmos como **admin externo** (fuera del runtime principal).

## Features

- Workspaces: alta + listado
- Ideas: alta + listado
- Entidades: alta + listado
- Búsqueda local con SQLite FTS5
- Monitor de servicios por `health_url` (registro + check)
- Restart seguro con whitelist (`systemctl restart`)
- Conexión a endpoint IA local: `http://localhost:17877/ai/decision`
- Registro de actividad y decisiones
- Dashboard visual tipo control center (métricas, actividad y servicios)
- Endpoint agregado: `GET /api/dashboard`

## Run

```bash
cd tools/endcosmos_admin_mvp
python endcosmos_admin.py
```

Abrir: `http://127.0.0.1:8088`

Health: `http://127.0.0.1:8088/health`

Dashboard JSON: `http://127.0.0.1:8088/api/dashboard`

## API disponible (MVP)

- `GET /api/workspaces`
- `POST /api/workspaces`
- `GET /api/ideas`
- `POST /api/ideas`
- `GET /api/entities`
- `POST /api/entities`
- `GET /api/services`
- `POST /api/services`
- `POST /api/services/check`
- `POST /api/services/restart`
- `GET /api/activity`
- `GET /api/search?q=...`
- `POST /api/decision`
- `GET /api/dashboard`

## Ejemplos curl (mínimos)

Crear workspace:

```bash
curl -X POST http://127.0.0.1:8088/api/workspaces \
	-H "Content-Type: application/json" \
	-d '{"name":"core-web","path":"C:/projects/endcosmos-web","notes":"workspace principal"}'
```

Chequear servicios registrados:

```bash
curl -X POST http://127.0.0.1:8088/api/services/check \
	-H "Content-Type: application/json" \
	-d '{}'
```

Pedir decisión IA:

```bash
curl -X POST http://127.0.0.1:8088/api/decision \
	-H "Content-Type: application/json" \
	-d '{"prompt":"Prioriza 3 tareas del sprint de EndCosmos"}'
```

En PowerShell usa `curl.exe` para evitar alias de `Invoke-WebRequest`.

## Quick smoke test (30s)

```bash
curl.exe http://127.0.0.1:8088/health ; \
curl.exe -X POST http://127.0.0.1:8088/api/workspaces -H "Content-Type: application/json" -d "{\"name\":\"smoke\",\"path\":\"C:/tmp/smoke\",\"notes\":\"quick test\"}" ; \
curl.exe http://127.0.0.1:8088/api/dashboard
```

Resultado esperado: respuesta `ok` en health, `id` en creación de workspace y métricas válidas en dashboard.

## Config

Variables opcionales:

- `ENDCOSMOS_AI_URL` (default `http://localhost:17877/ai/decision`)
- `ENDCOSMOS_RESTART_WHITELIST` (CSV, default `endcosmos-api,nginx,docker`)

Ejemplo:

```bash
set ENDCOSMOS_RESTART_WHITELIST=endcosmos-api,nginx
```

PowerShell:

```powershell
$env:ENDCOSMOS_RESTART_WHITELIST="endcosmos-api,nginx"
```

## Nota

El restart usa `systemctl`, pensado para Linux. Si lo ejecutas en Windows local, la operación de restart devolverá error (el resto del MVP funciona igual).
