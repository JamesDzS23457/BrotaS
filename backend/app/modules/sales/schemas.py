"""Esquemas del módulo sales (ventas y sus items)."""
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# Métodos de pago aceptados (lista cerrada: así los reportes salen limpios)
MetodoPago = Literal["efectivo", "transferencia", "tarjeta"]


class SaleItemIn(BaseModel):
    """Un item de la venta: producto y cantidad."""

    model_config = ConfigDict(extra="forbid")

    product_id: int
    quantity: int = Field(gt=0, description="Cantidad (mínimo 1)")


class SaleCreate(BaseModel):
    """Datos para registrar una venta."""

    model_config = ConfigDict(extra="forbid")

    items: list[SaleItemIn] = Field(min_length=1, description="Al menos un item")
    payment_method: MetodoPago = Field(description="Cómo pagó el cliente")


class SaleItemOut(BaseModel):
    """Item guardado, con el precio que tenía al vender."""

    id: int
    product_id: int
    quantity: int
    unit_price: Decimal


class SaleOut(BaseModel):
    """Venta con sus items."""

    id: int
    tenant_id: int
    user_id: int
    total: Decimal
    payment_method: str | None
    created_at: datetime
    items: list[SaleItemOut]
