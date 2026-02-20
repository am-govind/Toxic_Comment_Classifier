"""
Configuration module — loads settings from environment variables.
Uses pydantic-settings for type-safe configuration with .env file support.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    # Server
    APP_NAME: str = "ToxGuard API"
    APP_VERSION: str = "1.0.0"
    HOST: str = "0.0.0.0"
    PORT: int = 4000
    DEBUG: bool = False

    # Security
    API_KEY: str = "toxguard-dev-key-change-me"
    CORS_ORIGINS: list[str] = ["chrome-extension://*"]
    ALLOWED_HOSTS: list[str] = ["*"]
    RATE_LIMIT: str = "30/minute"

    # Model — points to root-level models/ directory
    MODEL_PATH: str = str(
        Path(__file__).parent.parent.parent / "models" / "tox_model.h5"
    )
    TOKENIZER_PATH: str = str(
        Path(__file__).parent.parent.parent / "models" / "tokenizer.pickle"
    )
    MAX_SEQUENCE_LENGTH: int = 100

    # Input limits
    MAX_COMMENTS_PER_REQUEST: int = 500
    MAX_COMMENT_LENGTH: int = 500

    # Classification
    CATEGORIES: list[str] = [
        "toxic",
        "severe_toxic",
        "obscene",
        "threat",
        "insult",
        "identity_hate",
    ]

    model_config = {
        "env_file": str(Path(__file__).parent.parent / ".env"),
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
