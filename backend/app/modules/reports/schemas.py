"""Esquemas del módulo reports (reportes)."""
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field

from app.modules.products.schemas import ProductOut


class TopProduct(BaseModel):
    """Un producto del top: cuánto se vendió y por cuánto."""

    product_id: int
    name: str
    quantity: int = Field(description="Unidades vendidas ese día")
    revenue: Decimal = Field(description="Plata que dejó ese día (COP)")


class DailyReport(BaseModel):
    """Reporte del día: lo vendido, lo más vendido y lo que se está acabando."""

    date: date
    total_sold: Decimal = Field(description="Total vendido ese día (COP)")
    sales_count: int = Field(description="Número de ventas ese día")
    top_products: list[TopProduct] = Field(description="Los 5 más vendidos")
    low_stock: list[ProductOut] = Field(description="Agotados o con poco stock")
