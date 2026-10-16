"""Reglas de negocio del módulo stock (movimientos de stock).

Cada cambio de stock queda registrado en ``stock_movements`` dentro de la misma
transacción que actualiza el producto: nunca quedan descuadrados.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.products.models import Product
from app.modules.stock.models import StockMovement
from app.modules.stock.schemas import StockMove
from app.shared.errors import DomainError, NotFoundError


def move_stock(
    db: Session,
    tenant_id: int,
    product_id: int,
    user_id: int,
    data: StockMove,
) -> tuple[StockMovement, int]:
    """Suma o resta stock y registra el movimiento. Devuelve el movimiento y el
    stock que quedó. El stock nunca puede quedar negativo."""
    product = db.scalar(
        select(Product)
        .where(Product.id == product_id, Product.tenant_id == tenant_id)
        .with_for_update()  # bloquea la fila: dos movimientos no se pisan
    )
    if product is None:
        raise NotFoundError("Producto no encontrado")
    if data.change == 0:
        raise DomainError("La cantidad del movimiento no puede ser cero")

    nuevo = product.stock + data.change
    if nuevo < 0:
        raise DomainError(
            f"El movimiento dejaría el stock en negativo (actual: {product.stock})"
        )

    product.stock = nuevo
    movement = StockMovement(
        tenant_id=tenant_id,
        product_id=product.id,
        user_id=user_id,
        quantity_change=data.change,
        reason=data.reason,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement, nuevo


def list_low_stock(db: Session, tenant_id: int) -> list[Product]:
    """Productos activos con stock menor o igual a su mínimo, del más bajo primero."""
    return list(
        db.scalars(
            select(Product)
            .where(
                Product.tenant_id == tenant_id,
                Product.is_active.is_(True),
                Product.stock <= Product.min_stock,
            )
            .order_by(Product.stock, Product.id)
        )
    )
