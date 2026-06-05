from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import os


class Settings(BaseSettings):
    # OpenRouter
    OPENROUTER_API_KEY: str = ""
    APP_URL: str = "http://localhost:8000"

    # App
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    MAX_INPUT_LENGTH: int = 50000
    DEFAULT_MODEL: str = "anthropic/claude-3-haiku"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Database
    DATABASE_URL: str = "./data/conversions.db"

    # Rate limiting
    RATE_LIMIT_PER_HOUR: int = 60

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
