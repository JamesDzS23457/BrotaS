"""Esquemas del módulo products (productos y categorías)."""
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class ProductOut(BaseModel):
    """Producto que se devuelve al cliente."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    category_id: int | None
    name: str
    description: str | None
    price: Decimal
    stock: int
    min_stock: int
    image_url: str | None
    is_published: bool
    is_active: bool
