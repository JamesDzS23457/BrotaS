"""Punto de entrada de la API."""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.shared.errors import DomainError

# Importar todos los modelos para que SQLAlchemy registre las tablas (necesario por las FK)
from app.modules.auth import models as auth_models  # noqa: F401
from app.modules.products import models as products_models  # noqa: F401
from app.modules.sales import models as sales_models  # noqa: F401
from app.modules.stock import models as stock_models  # noqa: F401
from app.modules.tenants import models as tenants_models  # noqa: F401
from app.modules.admin.router import router as admin_router
from app.modules.auth.router import router as auth_router
from app.modules.catalog.router import router as catalog_router
from app.modules.products.router import categories_router, router as products_router
from app.modules.reports.router import router as reports_router
from app.modules.sales.router import router as sales_router
from app.modules.stock.router import router as stock_router
from app.modules.tenants.router import router as tenants_router

settings = get_settings()

app = FastAPI(title=settings.platform_name)

# CORS: solo los orígenes configurados
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Todas las rutas de plataforma cuelgan de /api/v1; las de cada aplicación, de
# /api/v1/<app> (así se versiona y se suman rubros sin romper nada)
API_PREFIX = "/api/v1"
FLORIST_PREFIX = "/api/v1/florist"

for module_router in (
    auth_router,
    tenants_router,
    admin_router,
):
    app.include_router(module_router, prefix=API_PREFIX)

for module_router in (
    products_router,
    categories_router,
    stock_router,
    sales_router,
    reports_router,
    catalog_router,
):
    app.include_router(module_router, prefix=FLORIST_PREFIX)


@app.exception_handler(DomainError)
def domain_error_handler(_: Request, exc: DomainError) -> JSONResponse:
    """Traduce los errores de negocio (404, 409, 400...) a respuestas HTTP."""
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    """Comprobación rápida de que la API responde."""
    return {"status": "ok"}
