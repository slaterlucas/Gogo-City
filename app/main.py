"""FastAPI application entry point."""
import cloudinary
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.core.config import get_settings

settings = get_settings()

if settings.cloudinary_url:
    from urllib.parse import urlparse
    _c = urlparse(settings.cloudinary_url)
    cloudinary.config(
        cloud_name=_c.hostname,
        api_key=_c.username,
        api_secret=_c.password,
    )

app = FastAPI(
    title="GoGoCity API",
    description="API for generating personalized city exploration routes",
    version="0.1.0",
    debug=settings.debug,
)

cors_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "name": "GoGoCity API",
        "version": "0.1.0",
        "docs": "/docs",
    }
