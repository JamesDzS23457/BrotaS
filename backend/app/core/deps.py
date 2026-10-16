"""Dependencias compartidas de FastAPI (usuario autenticado, roles y local)."""
from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt import InvalidTokenError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.modules.auth.models import User, UserRole
from app.modules.tenants.models import Tenant, TenantApp, TenantStatus
from app.modules.tenants.service import has_feature

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


def get_tenant_id(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> int:
    """Devuelve el id del local del usuario autenticado.

    Es la guardia de tenant: rechaza con 403 si el usuario no pertenece a un local
    o si su local está suspendido. Todos los endpoints de negocio deben usarla para
    no leer ni escribir datos de otro local.
    """
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario no pertenece a ningún local",
        )

    tenant = db.get(Tenant, current_user.tenant_id)
    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El local no existe",
        )

    if tenant.status == TenantStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El local está suspendido. Contacte al administrador de la plataforma.",
        )

    return tenant.id


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


def require_app(code: str) -> Callable[..., int]:
    """Devuelve una dependencia que exige el local activo y con esa app contratada.

    Reemplaza a ``get_tenant_id`` en los endpoints de cada aplicación.
    """

    def checker(
        tenant_id: int = Depends(get_tenant_id),
        db: Session = Depends(get_db),
    ) -> int:
        contratada = db.scalar(
            select(TenantApp.id).where(
                TenantApp.tenant_id == tenant_id,
                TenantApp.app_code == code,
                TenantApp.is_active.is_(True),
            )
        )
        if contratada is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Este local no tiene contratada esa aplicación",
            )
        return tenant_id

    return checker


def require_feature(feature: str) -> Callable[..., int]:
    """Devuelve una dependencia que exige que el plan del local traiga esa función
    (por ejemplo, `pagina` para el catálogo público)."""

    def checker(
        tenant_id: int = Depends(get_tenant_id),
        db: Session = Depends(get_db),
    ) -> int:
        if not has_feature(db, tenant_id, feature):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El plan de este local no incluye esa función",
            )
        return tenant_id

    return checker
