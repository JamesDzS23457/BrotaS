"""Seguridad: hash de contraseñas (bcrypt vía passlib) y tokens JWT."""
from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from app.core.config import get_settings

settings = get_settings()

# Contexto de passlib para el hash bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Devuelve el hash bcrypt de la contraseña."""
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Comprueba si la contraseña coincide con su hash."""
    return pwd_context.verify(password, password_hash)


def create_access_token(user_id: int, tenant_id: int | None, role: str) -> str:
    """Crea un JWT con el user_id, el tenant_id y el role."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "user_id": user_id,
        "tenant_id": tenant_id,
        "role": role,
        "exp": expire,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict:
    """Valida el token y devuelve su contenido (lanza InvalidTokenError si es inválido)."""
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
