"""Esquemas del módulo products (productos y categorías)."""
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

# Textos: se les quitan los espacios sobrantes y se valida el largo ya limpio
NombreCategoria = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)
]
NombreProducto = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=160)
]
Descripcion = Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)]
Imagen = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]
# Dinero en COP: máximo 12 dígitos con 2 decimales, nunca negativo y nunca float
Precio = Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=2)]


# ------------------------------------------------------------------- categorías
class CategoryCreate(BaseModel):
    """Datos para crear una categoría."""

    model_config = ConfigDict(extra="forbid")

    name: NombreCategoria


class CategoryUpdate(BaseModel):
    """Datos para editar una categoría. Todo es opcional (edición parcial)."""

    model_config = ConfigDict(extra="forbid")

    name: NombreCategoria | None = None
    is_active: bool | None = Field(default=None, description="Permite reactivarla")


class CategoryOut(BaseModel):
    """Categoría que se devuelve al cliente."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    name: str
    is_active: bool


# -------------------------------------------------------------------- productos
class ProductCreate(BaseModel):
    """Datos para crear un producto.

    No incluye ``stock``: el stock nace en cero y solo cambia con los movimientos
    del módulo stock, así el historial nunca queda descuadrado.
    """

    model_config = ConfigDict(extra="forbid")

    name: NombreProducto
    description: Descripcion | None = None
    price: Precio = Field(description="Precio en COP")
    category_id: int | None = Field(default=None, description="Categoría del mismo local")
    min_stock: int = Field(default=0, ge=0, description="Umbral para avisar de stock bajo")
    image_url: Imagen | None = None
    is_published: bool = Field(default=False, description="Visible en el catálogo público")


class ProductUpdate(BaseModel):
    """Datos para editar un producto. Todo es opcional (edición parcial)."""

    model_config = ConfigDict(extra="forbid")

    name: NombreProducto | None = None
    description: Descripcion | None = None
    price: Precio | None = None
    category_id: int | None = None
    min_stock: int | None = Field(default=None, ge=0)
    image_url: Imagen | None = None
    is_published: bool | None = None
    is_active: bool | None = Field(default=None, description="Permite reactivarlo")


class ProductOut(BaseModel):
    """Producto que se devuelve al cliente."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    category_id: int | None
    name: str
    description: str | None
    price: Decimal
    stock: int
    min_stock: int
    image_url: str | None
    is_published: bool
    is_active: bool


class ProductPage(BaseModel):
    """Una página de productos más los datos de la paginación."""

    items: list[ProductOut]
    total: int
    page: int
    page_size: int
    pages: int
