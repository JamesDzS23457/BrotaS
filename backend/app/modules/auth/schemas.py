"""Esquemas del módulo auth (usuarios y login)."""
from pydantic import BaseModel, ConfigDict

from app.modules.auth.models import UserRole


class LoginRequest(BaseModel):
    """Datos para iniciar sesión."""

    email: str
    password: str


class TokenResponse(BaseModel):
    """Token de acceso devuelto al iniciar sesión."""

    access_token: str
    token_type: str = "bearer"


class UserProfile(BaseModel):
    """Datos del usuario autenticado."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    tenant_id: int | None
    role: UserRole
    currency: str | None = None
    timezone: str | None = None
