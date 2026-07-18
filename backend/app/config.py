import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "RADIX Talent Match API"
    DEBUG: bool = True
    
    # Security
    JWT_SECRET: str = "radix_super_secret_session_token_key_generation_2026_dev_mode"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # API Configuration
    OPENROUTER_API_KEY: Optional[str] = None

    # Database
    DATABASE_URL: str = "sqlite:///./radix.db"
    
    # LLM Provider Configuration (Local Ollama)
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:14b-instruct"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"
    LLM_MAX_TOKENS: int = 4000
    
    # File Storage
    STORAGE_DIR: str = "./storage"

    # SettingsConfigDict handles loading variables from a .env file
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure storage directory exists
os.makedirs(settings.STORAGE_DIR, exist_ok=True)
