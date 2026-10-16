"""Router HTTP del módulo sales (ventas).

Vender es trabajo de mostrador: dueño y empleado venden y consultan.
"""
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_app, require_role
from app.modules.auth.models import User, UserRole
from app.modules.sales import service
from app.modules.sales.models import Sale, SaleItem
from app.modules.sales.schemas import SaleCreate, SaleItemOut, SaleOut
from app.modules.tenants.service import get_timezone

router = APIRouter(prefix="/sales", tags=["sales"])

VENDEDORES = (UserRole.OWNER, UserRole.STAFF)


def _sale_out(sale: Sale, items: list[SaleItem]) -> SaleOut:
    """Arma la respuesta de una venta con sus items."""
    return SaleOut(
        id=sale.id,
        tenant_id=sale.tenant_id,
        user_id=sale.user_id,
        total=sale.total,
        payment_method=sale.payment_method,
        created_at=sale.created_at,
        items=[
            SaleItemOut(
                id=item.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
            )
            for item in items
        ],
    )


@router.post("", response_model=SaleOut, status_code=status.HTTP_201_CREATED)
def create_sale(
    data: SaleCreate,
    tenant_id: int = Depends(require_app("florist")),
    current_user: User = Depends(require_role(*VENDEDORES)),
    db: Session = Depends(get_db),
) -> SaleOut:
    """Registra una venta: valida stock, congela precios, descuenta y mueve stock,
    todo en una sola transacción."""
    sale = service.create_sale(db, tenant_id, current_user.id, data)
    return _sale_out(sale, service.items_of_sale(db, sale.id))


@router.get("", response_model=list[SaleOut])
def read_sales(
    desde: date | None = Query(None, description="Primer día (AAAA-MM-DD, Bogotá)"),
    hasta: date | None = Query(None, description="Último día, incluido (AAAA-MM-DD)"),
    tenant_id: int = Depends(require_app("florist")),
    _: User = Depends(require_role(*VENDEDORES)),
    db: Session = Depends(get_db),
) -> list[SaleOut]:
    """Lista las ventas del local, con filtro de fechas opcional."""
    return [
        _sale_out(sale, items)
        for sale, items in service.list_sales(
            db, tenant_id, desde=desde, hasta=hasta, tz=get_timezone(db, tenant_id)
        )
    ]
