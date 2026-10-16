"""Router HTTP del módulo products (productos y categorías).

El router solo traduce HTTP a llamadas al servicio: las reglas de negocio viven
en ``service.py``. Leer exige estar en un local activo; escribir exige, además,
ser ``owner`` del local (``staff`` solo lee).
"""
from math import ceil

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_tenant_id, require_role
from app.modules.auth.models import User, UserRole
from app.modules.products import service
from app.modules.products.models import Category, Product
from app.modules.products.schemas import (
    CategoryCreate,
    CategoryOut,
    CategoryUpdate,
    ProductCreate,
    ProductOut,
    ProductPage,
    ProductUpdate,
)

router = APIRouter(prefix="/products", tags=["products"])
categories_router = APIRouter(prefix="/categories", tags=["categories"])


# -------------------------------------------------------------------- productos
@router.get("", response_model=ProductPage)
def read_products(
    search: str | None = Query(None, max_length=160, description="Busca por nombre"),
    category_id: int | None = Query(None, description="Filtra por una categoría"),
    include_inactive: bool = Query(False, description="Incluye los productos desactivados"),
    page: int = Query(1, ge=1, description="Página (empieza en 1)"),
    page_size: int = Query(20, ge=1, le=100, description="Productos por página"),
    tenant_id: int = Depends(get_tenant_id),
    db: Session = Depends(get_db),
) -> ProductPage:
    """Lista los productos del local del usuario, con búsqueda, filtro y paginación."""
    items, total = service.list_products(
        db,
        tenant_id,
        search=search,
        category_id=category_id,
        include_inactive=include_inactive,
        page=page,
        page_size=page_size,
    )
    return ProductPage(
        items=[ProductOut.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=ceil(total / page_size) if total else 0,
    )


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductCreate,
    tenant_id: int = Depends(get_tenant_id),
    _: User = Depends(require_role(UserRole.OWNER)),
    db: Session = Depends(get_db),
) -> Product:
    """Crea un producto en el local. Solo el dueño."""
    return service.create_product(db, tenant_id, data)


@router.get("/{product_id}", response_model=ProductOut)
def read_product(
    product_id: int,
    tenant_id: int = Depends(get_tenant_id),
    db: Session = Depends(get_db),
) -> Product:
    """Devuelve un producto del local (aunque esté desactivado)."""
    return service.get_product(db, tenant_id, product_id)


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    data: ProductUpdate,
    tenant_id: int = Depends(get_tenant_id),
    _: User = Depends(require_role(UserRole.OWNER)),
    db: Session = Depends(get_db),
) -> Product:
    """Edita un producto, por partes. Solo el dueño."""
    return service.update_product(db, tenant_id, product_id, data)


@router.delete("/{product_id}", response_model=ProductOut)
def deactivate_product(
    product_id: int,
    tenant_id: int = Depends(get_tenant_id),
    _: User = Depends(require_role(UserRole.OWNER)),
    db: Session = Depends(get_db),
) -> Product:
    """Desactiva un producto (borrado lógico, no se borra de la base)."""
    return service.deactivate_product(db, tenant_id, product_id)


@router.post("/{product_id}/image", response_model=ProductOut)
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(..., description="Foto jpg, png o webp de 3 MB máximo"),
    tenant_id: int = Depends(get_tenant_id),
    _: User = Depends(require_role(UserRole.OWNER)),
    db: Session = Depends(get_db),
) -> Product:
    """Sube la foto del producto: se valida, se deja en webp de 1200 px y se guarda
    en Azure. Si había otra foto nuestra, se borra. Solo el dueño."""
    contenido = await file.read()
    return service.set_product_image(db, tenant_id, product_id, contenido)


# ------------------------------------------------------------------ categorías
@categories_router.get("", response_model=list[CategoryOut])
def read_categories(
    search: str | None = Query(None, max_length=120, description="Busca por nombre"),
    include_inactive: bool = Query(False, description="Incluye las categorías desactivadas"),
    tenant_id: int = Depends(get_tenant_id),
    db: Session = Depends(get_db),
) -> list[Category]:
    """Lista las categorías del local.

    No se pagina a propósito: son pocas y el cliente las necesita todas para el
    filtro y el formulario de productos.
    """
    return service.list_categories(
        db, tenant_id, search=search, include_inactive=include_inactive
    )


@categories_router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    tenant_id: int = Depends(get_tenant_id),
    _: User = Depends(require_role(UserRole.OWNER)),
    db: Session = Depends(get_db),
) -> Category:
    """Crea una categoría en el local. Solo el dueño."""
    return service.create_category(db, tenant_id, data)


@categories_router.get("/{category_id}", response_model=CategoryOut)
def read_category(
    category_id: int,
    tenant_id: int = Depends(get_tenant_id),
    db: Session = Depends(get_db),
) -> Category:
    """Devuelve una categoría del local (aunque esté desactivada)."""
    return service.get_category(db, tenant_id, category_id)


@categories_router.patch("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    data: CategoryUpdate,
    tenant_id: int = Depends(get_tenant_id),
    _: User = Depends(require_role(UserRole.OWNER)),
    db: Session = Depends(get_db),
) -> Category:
    """Renombra o reactiva una categoría. Solo el dueño."""
    return service.update_category(db, tenant_id, category_id, data)


@categories_router.delete("/{category_id}", response_model=CategoryOut)
def deactivate_category(
    category_id: int,
    tenant_id: int = Depends(get_tenant_id),
    _: User = Depends(require_role(UserRole.OWNER)),
    db: Session = Depends(get_db),
) -> Category:
    """Desactiva una categoría (borrado lógico): sus productos la conservan."""
    return service.deactivate_category(db, tenant_id, category_id)
