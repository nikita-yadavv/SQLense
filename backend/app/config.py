from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Platform database
    platform_database_url: str

    # JWT
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # Fernet encryption key (for org DB credentials)
    fernet_key: str

    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:3b"


    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:5173"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
