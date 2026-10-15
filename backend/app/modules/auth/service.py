"""Reglas de negocio del módulo auth (usuarios y login)."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.modules.auth.models import User


def authenticate(db: Session, email: str, password: str) -> User | None:
    """Devuelve el usuario si el correo y la contraseña son correctos."""
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
