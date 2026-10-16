"""Reglas de negocio del módulo reports (reportes).

Los reportes solo leen: agregan ventas y stock del local, sin tocar nada.
"""
from datetime import date, datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.products.models import Product
from app.modules.products.schemas import ProductOut
from app.modules.sales.models import Sale, SaleItem
from app.modules.stock import service as stock_service
from app.modules.reports.schemas import DailyReport, TopProduct

# Si nadie indica otra, los días del reporte se entienden en Bogotá
BOGOTA = ZoneInfo("America/Bogota")


def get_daily_report(db: Session, tenant_id: int, fecha: date, tz: ZoneInfo = BOGOTA) -> DailyReport:
    """Arma el reporte del día: total, conteo, top 5 y stock bajo."""
    inicio = datetime(fecha.year, fecha.month, fecha.day, tzinfo=tz)
    fin = inicio + timedelta(days=1)
    en_el_dia = [Sale.tenant_id == tenant_id, Sale.created_at >= inicio, Sale.created_at < fin]

    total = db.scalar(
        select(func.coalesce(func.sum(Sale.total), Decimal("0"))).where(*en_el_dia)
    )
    conteo = db.scalar(select(func.count()).select_from(Sale).where(*en_el_dia)) or 0

    filas = db.execute(
        select(
            Product.id,
            Product.name,
            func.sum(SaleItem.quantity),
            func.sum(SaleItem.quantity * SaleItem.unit_price),
        )
        .join(SaleItem, SaleItem.product_id == Product.id)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(*en_el_dia)
        .group_by(Product.id, Product.name)
        .order_by(func.sum(SaleItem.quantity).desc(), Product.id)
        .limit(5)
    ).all()
    top = [
        TopProduct(product_id=pid, name=nombre, quantity=cantidad, revenue=plata)
        for pid, nombre, cantidad, plata in filas
    ]

    bajo = stock_service.list_low_stock(db, tenant_id)  # agotados o con poco stock

    return DailyReport(
        date=fecha,
        total_sold=total,
        sales_count=conteo,
        top_products=top,
        low_stock=[ProductOut.model_validate(p) for p in bajo],
    )
