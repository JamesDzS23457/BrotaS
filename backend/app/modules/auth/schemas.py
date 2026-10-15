"""Esquemas del módulo auth (usuarios y login)."""
from pydantic import BaseModel


class LoginRequest(BaseModel):
    """Datos para iniciar sesión."""

    email: str
    password: str


class TokenResponse(BaseModel):
    """Token de acceso devuelto al iniciar sesión."""

    access_token: str
    token_type: str = "bearer"
