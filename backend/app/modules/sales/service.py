"""Reglas de negocio del módulo sales (ventas y sus items).

La venta es una sola transacción: venta, items, descuento de stock y movimientos
se guardan juntos o no se guarda nada.
"""
from datetime import date, datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.products.models import Product
from app.modules.sales.models import Sale, SaleItem
from app.modules.sales.schemas import SaleCreate
from app.modules.stock.models import StockMovement
from app.shared.errors import DomainError, NotFoundError

# Los días del filtro se entienden en la zona horaria de los reportes
BOGOTA = ZoneInfo("America/Bogota")


def create_sale(db: Session, tenant_id: int, user_id: int, data: SaleCreate) -> Sale:
    """Registra la venta: valida stock, congela precios, descuenta y mueve stock."""
    # Si un producto viene repetido, sus cantidades se suman
    cantidades: dict[int, int] = {}
    for item in data.items:
        cantidades[item.product_id] = cantidades.get(item.product_id, 0) + item.quantity

    products = list(
        db.scalars(
            select(Product)
            .where(Product.tenant_id == tenant_id, Product.id.in_(cantidades))
            .with_for_update()  # bloquea las filas: dos ventas no se pisan
            .order_by(Product.id)
        )
    )
    if len(products) != len(cantidades):
        raise NotFoundError("Hay productos que no existen en este local")
    for product in products:
        if not product.is_active:
            raise DomainError(f"«{product.name}» ya no está disponible para la venta")
        if product.stock < cantidades[product.id]:
            raise DomainError(
                f"Sin stock suficiente de «{product.name}» (hay {product.stock})"
            )

    sale = Sale(
        tenant_id=tenant_id,
        user_id=user_id,
        total=Decimal("0"),
        payment_method=data.payment_method,
    )
    db.add(sale)
    db.flush()  # para tener el id antes de crear los items

    total = Decimal("0")
    for product in products:
        cantidad = cantidades[product.id]
        total += product.price * cantidad
        product.stock -= cantidad
        db.add(
            SaleItem(
                tenant_id=tenant_id,
                sale_id=sale.id,
                product_id=product.id,
                quantity=cantidad,
                unit_price=product.price,  # se congela el precio de hoy
            )
        )
        db.add(
            StockMovement(
                tenant_id=tenant_id,
                product_id=product.id,
                user_id=user_id,
                quantity_change=-cantidad,
                reason="venta",
            )
        )
    sale.total = total
    db.commit()
    db.refresh(sale)
    return sale


def items_of_sale(db: Session, sale_id: int) -> list[SaleItem]:
    """Items de una venta, en orden."""
    return list(
        db.scalars(select(SaleItem).where(SaleItem.sale_id == sale_id).order_by(SaleItem.id))
    )


def _inicio_dia(dia: date) -> datetime:
    """Medianoche de ese día en Bogotá (con zona horaria)."""
    return datetime(dia.year, dia.month, dia.day, tzinfo=BOGOTA)


def list_sales(
    db: Session,
    tenant_id: int,
    *,
    desde: date | None = None,
    hasta: date | None = None,
) -> list[tuple[Sale, list[SaleItem]]]:
    """Ventas del local, del `hasta` hacia atrás; cada una con sus items.

    Las fechas son días calendario en Bogotá e incluyen ambos extremos.
    """
    condiciones = [Sale.tenant_id == tenant_id]
    if desde is not None:
        condiciones.append(Sale.created_at >= _inicio_dia(desde))
    if hasta is not None:
        condiciones.append(Sale.created_at < _inicio_dia(hasta + timedelta(days=1)))

    sales = list(
        db.scalars(select(Sale).where(*condiciones).order_by(Sale.id.desc()))
    )
    if not sales:
        return []
    items = list(
        db.scalars(
            select(SaleItem)
            .where(SaleItem.sale_id.in_([s.id for s in sales]))
            .order_by(SaleItem.id)
        )
    )
    por_venta: dict[int, list[SaleItem]] = {}
    for item in items:
        por_venta.setdefault(item.sale_id, []).append(item)
    return [(sale, por_venta.get(sale.id, [])) for sale in sales]
