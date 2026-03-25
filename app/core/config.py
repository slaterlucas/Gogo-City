"""Application configuration using pydantic-settings."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    
    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/gogocity"

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    # JWT auth
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

    # Cloudinary
    cloudinary_url: str = ""

    # Railway (reference only, not used by local app)
    railway_database_url: str = ""

    # Admin
    admin_emails: str = ""

    # CORS — comma-separated origins, or "*" for dev
    cors_origins: str = "*"

    # App settings
    debug: bool = False


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
