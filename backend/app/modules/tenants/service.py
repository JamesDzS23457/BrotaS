"""Reglas de negocio del módulo tenants (locales, apps y planes).

Los planes definen qué trae cada contratación: por ahora `inventario` (sin página
pública) y `completo` (con página pública, función `pagina`).
"""
import logging
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.tenants.models import Tenant, TenantApp

log = logging.getLogger(__name__)

# Funciones que trae cada plan (el catálogo de planes vive aquí)
PLAN_FEATURES: dict[str, frozenset[str]] = {
    "inventario": frozenset(),
    "completo": frozenset({"pagina"}),
}


def get_plan(db: Session, tenant_id: int) -> str:
    """Plan del local en la app florist (por defecto, inventario)."""
    plan = db.scalar(
        select(TenantApp.plan).where(
            TenantApp.tenant_id == tenant_id, TenantApp.app_code == "florist"
        )
    )
    return plan or "inventario"


def has_feature(db: Session, tenant_id: int, feature: str) -> bool:
    """Dice si el plan del local trae esa función."""
    return feature in PLAN_FEATURES.get(get_plan(db, tenant_id), frozenset())


def get_timezone(db: Session, tenant_id: int) -> ZoneInfo:
    """Zona horaria del local (si está mal escrita, Bogotá y un aviso)."""
    nombre = db.scalar(select(Tenant.timezone).where(Tenant.id == tenant_id))
    try:
        return ZoneInfo(nombre or "America/Bogota")
    except ZoneInfoNotFoundError:
        log.warning("Zona horaria inválida en el local %s: %s", tenant_id, nombre)
        return ZoneInfo("America/Bogota")
