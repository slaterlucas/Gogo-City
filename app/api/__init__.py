"""API router configuration."""
from fastapi import APIRouter

from app.api.routes import achievements, auth, checkins, cities, generate, health, instances, sharing, submissions, templates

api_router = APIRouter()

# Include route modules
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(cities.router, prefix="/cities", tags=["cities"])
api_router.include_router(generate.router, prefix="/routes", tags=["routes"])
api_router.include_router(templates.router, prefix="/templates", tags=["templates"])
api_router.include_router(instances.router, prefix="/instances", tags=["instances"])
api_router.include_router(sharing.router, prefix="/routes", tags=["sharing"])
api_router.include_router(checkins.router, prefix="/check-ins", tags=["check-ins"])
api_router.include_router(submissions.router, prefix="/submissions", tags=["submissions"])
api_router.include_router(achievements.router, prefix="/achievements", tags=["achievements"])
