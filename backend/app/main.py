import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.database import Base, engine
from app.routes.ai import router as ai_router
from app.routes.admin import router as admin_router
from app.routes.auth import router as auth_router
from app.routes.cosmos import router as cosmos_router
from app.routes.images import router as images_router
from app.routes.world import router as world_router
from app.schemas import HealthResponse


load_dotenv()


app = FastAPI(
    title="EndCosmos Auth API",
    version="1.0.0",
    description="Professional registration/login module for EndCosmos.",
)

# Create tables if they do not exist.
# In production, prefer migrations (Alembic) after first deployment.
Base.metadata.create_all(bind=engine)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "https://endcosmos.com,https://www.endcosmos.com,http://127.0.0.1:5500,http://localhost:5500",
    ).split(",")
    if origin.strip()
]

allowed_hosts = [
    host.strip()
    for host in os.getenv(
        "ALLOWED_HOSTS",
        "endcosmos.com,www.endcosmos.com,localhost,127.0.0.1",
    ).split(",")
    if host.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "HEAD"],
    allow_headers=["*"],
)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        response.headers.setdefault("Cross-Origin-Resource-Policy", "same-site")
        return response


app.add_middleware(SecurityHeadersMiddleware)


SENIOR_USER_PROFILE = "VIVI"
SENIOR_VARIABLES = [
    {
        "name": "UNKTIME",
        "priority": 1,
        "focus": "Tiempo desconocido y decision bajo incertidumbre",
    },
    {
        "name": "PSI_ABSTRACT",
        "priority": 2,
        "focus": "Psicologia abstracta aplicada a la accion",
    },
    {
        "name": "ETHOS_RIGOR",
        "priority": 3,
        "focus": "Disciplina filosofica y criterio estricto",
    },
    {
        "name": "NARRATIVE_GRAVITY",
        "priority": 4,
        "focus": "Contenido con peso y direccion real",
    },
    {
        "name": "LIFE_SIGNAL",
        "priority": 5,
        "focus": "Impacto vital medible en procesos creativos",
    },
]


@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(success=True, service="endcosmos-auth", status="ok")


@app.get("/philosophy/variables")
def philosophy_variables():
    return {
        "success": True,
        "mode": "senior_creator_life_research",
        "user": SENIOR_USER_PROFILE,
        "variables": SENIOR_VARIABLES,
    }


app.include_router(auth_router)
app.include_router(cosmos_router)
app.include_router(admin_router)
app.include_router(images_router)
app.include_router(world_router)
app.include_router(ai_router)
