"""Esquemas del módulo stock (movimientos de stock)."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# Motivos permitidos para mover stock (los que usa el negocio)
MotivoMovimiento = Literal["compra", "ajuste", "pérdida"]


class StockMove(BaseModel):
    """Datos para sumar o restar stock. Positivo suma, negativo resta."""

    model_config = ConfigDict(extra="forbid")

    change: int = Field(description="Cantidad: positiva suma, negativa resta (no cero)")
    reason: MotivoMovimiento = Field(description="Motivo del movimiento")


class StockMovementOut(BaseModel):
    """Movimiento registrado, con el stock que quedó después."""

    id: int
    product_id: int
    quantity_change: int
    reason: str
    created_at: datetime
    stock_after: int
