# END COSMOS CORE

Arquitectura operativa:

Prompt → IA → API → Scripts → Servidor

Pipeline visual:

Imágenes → Embeddings → Vector Index (JSON) → IA interpreta → Sistema genera mundos

## 1) Análisis del sistema

- API actual: FastAPI (`app/main.py`) con módulo auth ya estable.
- Core añadido: indexador de imágenes, intérprete y generador del universo.
- Persistencia del core:
  - `backend/data/cosmos/image_index.json`
  - `backend/data/cosmos/universe_structure.json`

## 2) Estructura generada

- `app/cosmos_core.py`
  - OBSERVA: detecta imágenes del universo.
  - INTERPRETA: clasifica según reglas cósmicas.
  - ORDENA: asigna propósito y sistema.
  - EJECUTA/EVOLUCIONA: produce estructura del universo.
- `app/routes/cosmos.py`
  - `GET /cosmos/health`
  - `POST /cosmos/rebuild-index`
  - `POST /cosmos/evolve`
  - `GET /cosmos/state`
- `scripts/cosmos_cycle.py`
  - Ejecuta el ciclo completo por terminal.

## 3) Comandos para el servidor

### Windows (PowerShell)

```powershell
cd C:\Users\Vivi\OneDrive\COSMOS\endcosmos-web\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Debian (servidor remoto)

```bash
cd /ruta/endcosmos-web/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Conexión Windows → Debian por SSH

```powershell
ssh <usuario>@<ip-servidor>
```

Si tienes alias `cosmos` en `~/.ssh/config`:

```powershell
ssh cosmos
```

### Ejecutar evolución del cosmos por script

```bash
python scripts/cosmos_cycle.py
```

### Materializar VYRAKTH ∞ por script

```bash
python scripts/materialize_vyrakth.py
```

### Ejecutar evolución por API

```bash
curl -X POST http://127.0.0.1:8000/cosmos/evolve
curl http://127.0.0.1:8000/cosmos/state
```

### Materializar VYRAKTH ∞ por API

```bash
curl -X POST http://127.0.0.1:8000/cosmos/worlds/vyrakth/materialize
```

## 4) Interpretación del universo

Reglas aplicadas automáticamente:

- imagen portal → `portal_dimensional`
- imagen npc/character → `entidad`
- imagen planeta/world → `mundo`
- imagen ciudad/map → `mapa`
- recursos sin match directo → `evento`

Cada imagen se integra en sistemas:

- `world_generator`
- `entity_registry`
- `portal_network`
- `map_forge`
- `event_orchestrator`

## 5) Evolución del cosmos

Cada ejecución vuelve a:

1. observar nuevas imágenes,
2. reinterpretar su propósito,
3. reorganizar estructura,
4. actualizar el estado del universo.

El núcleo del proyecto no se destruye; sólo se expande con estructura adicional.
