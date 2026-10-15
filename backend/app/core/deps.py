"""Dependencias compartidas de FastAPI (usuario autenticado y roles)."""
from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.modules.auth.models import User, UserRole

# El token se envía en el encabezado Authorization (para /docs y los clientes)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Devuelve el usuario autenticado a partir del token."""
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
    except InvalidTokenError:
        raise credentials_error

    user_id = payload.get("user_id")
    if user_id is None:
        raise credentials_error

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise credentials_error
    return user


def require_role(*roles: UserRole) -> Callable[..., User]:
    """Devuelve una dependencia que exige que el usuario tenga uno de esos roles."""

    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para esta acción",
            )
        return current_user

    return checker
