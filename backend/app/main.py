"""Punto de entrada de la API."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.modules.admin.router import router as admin_router
from app.modules.auth.router import router as auth_router
from app.modules.catalog.router import router as catalog_router
from app.modules.products.router import router as products_router
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

# Todas las rutas de los módulos cuelgan de /api/v1
API_PREFIX = "/api/v1"

for module_router in (
    auth_router,
    tenants_router,
    products_router,
    stock_router,
    sales_router,
    reports_router,
    catalog_router,
    admin_router,
):
    app.include_router(module_router, prefix=API_PREFIX)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    """Comprobación rápida de que la API responde."""
    return {"status": "ok"}
