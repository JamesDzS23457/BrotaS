"""Router HTTP del módulo reports (reportes).

Leer reportes es de consulta: cualquier rol del local puede verlos.
"""
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_tenant_id
from app.modules.reports import service
from app.modules.reports.schemas import DailyReport

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/daily", response_model=DailyReport)
def read_daily_report(
    fecha: date = Query(..., alias="date", description="Día del reporte (AAAA-MM-DD, Bogotá)"),
    tenant_id: int = Depends(get_tenant_id),
    db: Session = Depends(get_db),
) -> DailyReport:
    """Devuelve el total, el conteo, el top 5 y el stock bajo de ese día."""
    return service.get_daily_report(db, tenant_id, fecha)
