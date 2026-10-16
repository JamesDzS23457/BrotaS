"""Modelos del módulo tenants (locales)."""
from datetime import datetime
from enum import StrEnum

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TenantStatus(StrEnum):
    """Estado del local."""

    ACTIVE = "active"
    SUSPENDED = "suspended"


class Tenant(Base):
    """Un local, que es un tenant independiente."""

    __tablename__ = "tenants"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(120), unique=True)
    status: Mapped[TenantStatus] = mapped_column(
        Enum(TenantStatus, name="tenant_status", values_callable=lambda e: [m.value for m in e]),
        default=TenantStatus.ACTIVE,
    )
    # Zona horaria y moneda propias: nada de valores escritos a mano en el código
    timezone: Mapped[str] = mapped_column(String(60), default="America/Bogota")
    currency: Mapped[str] = mapped_column(String(3), default="COP")
    whatsapp_phone: Mapped[str | None] = mapped_column(String(30))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class App(Base):
    """Aplicación de la plataforma por rubro (florist, luego bar y salon)."""

    __tablename__ = "apps"

    code: Mapped[str] = mapped_column(String(20), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))


class TenantApp(Base):
    """Aplicación contratada por un local, con su plan."""

    __tablename__ = "tenant_apps"
    __table_args__ = (UniqueConstraint("tenant_id", "app_code", name="uq_tenant_apps_tenant_app"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    app_code: Mapped[str] = mapped_column(ForeignKey("apps.code", ondelete="CASCADE"), index=True)
    plan: Mapped[str] = mapped_column(String(20), default="inventario")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
