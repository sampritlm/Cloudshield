import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.seed_data import seed_demo_data
from app.auth import require_analyst_or_admin, UserProfile
from app.routers import (
    auth,
    dashboard,
    events,
    incidents,
    simulator,
    reports,
    system,
    caniphish,
    webhook,
    users,
    alerts,
    settings_mgmt,
    user_portal
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s"
)
logger = logging.getLogger("cloudshield.app")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Seed initial demo events & incidents if storage is empty
    logger.info(f"Starting {settings.APP_NAME} in '{settings.APP_ENV}' mode (AWS_MODE={settings.AWS_MODE})...")
    seed_demo_data(force=False)
    logger.info("CloudShield database verified and initialized.")
    yield
    # Shutdown
    logger.info("CloudShield service shutting down gracefully.")

app = FastAPI(
    title="CloudShield API",
    description="Intelligent Cloud Security Monitoring and Automated Threat Detection System",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local Vite dev server and external clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(events.router)
app.include_router(incidents.router)
app.include_router(simulator.router)
app.include_router(reports.router)
app.include_router(system.router)
app.include_router(caniphish.router)
app.include_router(webhook.router)
app.include_router(users.router)
app.include_router(alerts.router)
app.include_router(settings_mgmt.router)
app.include_router(user_portal.router)

@app.get("/")
async def root():
    return {
        "system": "CloudShield — Intelligent Cloud Security Monitoring & Automated Threat Detection",
        "status": "ONLINE",
        "mode": "AWS Mode (Cloud Native)" if settings.AWS_MODE else "Local Simulation Mode",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

@app.post("/api/system/reset-demo")
async def reset_demo(current_user: UserProfile = Depends(require_analyst_or_admin)):
    """Resets storage to standard initial demo state."""
    seed_demo_data(force=True)
    return {"status": "SUCCESS", "message": "Demo security events and incidents re-seeded successfully."}
