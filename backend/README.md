# EndCosmos Auth Module (FastAPI + MariaDB/MySQL)

Módulo de registro/login profesional para EndCosmos, listo para integración en producción.

## 1) Estructura de carpetas

```text
backend/
  .env.example
  requirements.txt
  README.md
  sql/
    endcosmos_auth.sql
  app/
    __init__.py
    main.py
    database.py
    models.py
    schemas.py
    auth.py
    routes/
      __init__.py
      auth.py
public/
  register/
    index.html
  css/
    register.css
  js/
    register.js
```

## 2) Preparación en Debian 12

### Instalar dependencias de sistema

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip mariadb-server
```

### Crear entorno virtual e instalar backend

```bash
cd /ruta/a/endcosmos-web/backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Configurar variables de entorno

```bash
cp .env.example .env
nano .env
```

Configura en `.env` al menos:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `SECRET_KEY`

## 3) Crear base de datos y usuario en MariaDB

Entrar a MariaDB como root:

```bash
sudo mariadb
```

Crear DB y usuario:

```sql
CREATE DATABASE IF NOT EXISTS endcosmos_auth CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'endcosmos_user'@'%' IDENTIFIED BY 'ChangeThisStrongPassword!';
GRANT ALL PRIVILEGES ON endcosmos_auth.* TO 'endcosmos_user'@'%';
FLUSH PRIVILEGES;
EXIT;
```

Aplicar schema:

```bash
mariadb -u endcosmos_user -p endcosmos_auth < sql/endcosmos_auth.sql
```

## 4) Ejecutar API FastAPI

```bash
cd /ruta/a/endcosmos-web/backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

## 5) Endpoints disponibles

- `GET /health`
- `POST /register`
- `POST /login`

## 6) Ejemplos curl

### Registro

```bash
curl -X POST http://127.0.0.1:8000/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"NovaPilot",
    "email":"nova@example.com",
    "password":"SecurePass123",
    "confirm_password":"SecurePass123",
    "source":"web"
  }'
```

### Login

```bash
curl -X POST http://127.0.0.1:8000/login \
  -H "Content-Type: application/json" \
  -d '{
    "username_or_email":"NovaPilot",
    "password":"SecurePass123",
    "source":"web"
  }'
```

## 7) Frontend de registro

Archivo listo para usar:

- `public/register/index.html`

Recursos:

- `public/css/register.css`
- `public/js/register.js`

Por defecto, el frontend apunta a:

- `http://127.0.0.1:8000/register`

Si necesitas otro host, define antes de cargar `register.js`:

```html
<script>
  window.ENDCOSMOS_API_URL = "https://api.tudominio.com";
</script>
```

## 8) Seguridad aplicada

- Hash de contraseñas con bcrypt (Passlib).
- Validación backend estricta de username/email/password.
- Bloqueo básico de caracteres/secuencias peligrosas.
- Prevención de duplicados por validación + `UNIQUE` en DB.
- Registro de intentos en `login_logs`.
- JWT emitido en login para integración futura con rutas protegidas.
- Campos preparados para OAuth (`oauth_provider`, `oauth_subject`) para Discord/Google.

## 9) Notas de producción

- Mueve secretos a un gestor seguro (no en repo).
- Coloca FastAPI detrás de Nginx/Caddy con HTTPS.
- Añade rate limiting (ej. Redis + slowapi) para `/login` y `/register`.
- Añade sistema de envío real de emails para `email_verifications`.
- Usa migraciones con Alembic para cambios de schema.
