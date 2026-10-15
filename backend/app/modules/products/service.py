"""Reglas de negocio del módulo products (productos y categorías)."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.products.models import Product


def list_products(db: Session, tenant_id: int) -> list[Product]:
    """Devuelve los productos del local indicado (siempre filtrado por tenant)."""
    return list(
        db.scalars(
            select(Product).where(Product.tenant_id == tenant_id).order_by(Product.id)
        )
    )
