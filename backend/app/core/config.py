"""Configuración del backend, leída desde variables de entorno."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Variables de entorno de la aplicación."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Nombre de la plataforma (nunca se escribe a mano en el código)
    platform_name: str = "Brota"

    # Base de datos PostgreSQL
    database_url: str = "postgresql+psycopg://brotas:brotas@localhost:5432/brotas"

    # Seguridad (JWT)
    secret_key: str = "cambia-esta-clave-secreta-por-una-mas-larga"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # Orígenes permitidos por CORS, separados por comas
    cors_origins: str = "http://localhost:5173"

    # Fotos en Azure Blob Storage (contenedor "productos" por defecto)
    azure_storage_connection_string: str = ""
    azure_storage_container: str = "productos"

    @property
    def cors_origins_list(self) -> list[str]:
        """Devuelve los orígenes de CORS como lista."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Devuelve la configuración una sola vez por proceso."""
    return Settings()
