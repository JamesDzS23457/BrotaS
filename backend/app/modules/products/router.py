"""Router HTTP del módulo products (productos y categorías)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_tenant_id
from app.modules.products.models import Product
from app.modules.products.schemas import ProductOut
from app.modules.products.service import list_products

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductOut])
def read_products(
    tenant_id: int = Depends(get_tenant_id),
    db: Session = Depends(get_db),
) -> list[Product]:
    """Lista los productos del local del usuario autenticado.

    Ejemplo de uso de la guardia ``get_tenant_id``: el resultado siempre queda
    acotado al local del usuario, nunca al de otro.
    """
    return list_products(db, tenant_id)
