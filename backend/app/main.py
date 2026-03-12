import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routes.auth import router as auth_router
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
    for origin in os.getenv("ALLOWED_ORIGINS", "http://127.0.0.1:5500,http://localhost:5500").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(success=True, service="endcosmos-auth", status="ok")


app.include_router(auth_router)
