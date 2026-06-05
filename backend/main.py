import os
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import init_db
from app.routers import convert, history, health

# Configure structlog
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer(),
    ],
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("starting_up", environment=settings.ENVIRONMENT)
    os.makedirs("data", exist_ok=True)
    await init_db()
    logger.info("database_initialized")
    yield
    # Shutdown
    logger.info("shutting_down")


app = FastAPI(
    title="Oracle → PySpark Converter",
    description="AI-powered Oracle SQL to PySpark conversion tool",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list + ["*"],  # permissive for POC
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(convert.router, prefix="/api", tags=["Conversion"])
app.include_router(history.router, prefix="/api", tags=["History"])
app.include_router(health.router, prefix="/api", tags=["Health"])


@app.get("/")
async def root():
    return {
        "name": "Oracle → PySpark Converter API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
    }
