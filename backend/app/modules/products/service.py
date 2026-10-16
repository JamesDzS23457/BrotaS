"""Reglas de negocio del módulo products (productos y categorías).

Todo lo que hay aquí recibe el ``tenant_id`` ya resuelto y lo usa en cada
consulta: es imposible leer o escribir datos de otro local.
"""
import logging
from io import BytesIO
from uuid import uuid4

from PIL import Image, UnidentifiedImageError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core import storage as blob_storage
from app.modules.products.models import Category, Product
from app.modules.products.schemas import (
    CategoryCreate,
    CategoryUpdate,
    ProductCreate,
    ProductUpdate,
)
from app.shared.errors import (
    ConflictError,
    DomainError,
    NotFoundError,
    TooLargeError,
    UnsupportedTypeError,
)

log = logging.getLogger(__name__)

# Foto de producto: máximo 3 MB, solo jpg/png/webp reales, 1200 px de ancho
MAX_IMAGE_BYTES = 3 * 1024 * 1024
MAX_IMAGE_WIDTH = 1200
IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}


def _patron_busqueda(texto: str) -> str:
    """Arma el patrón LIKE escapando los comodines que escriba el usuario."""
    limpio = texto.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{limpio}%"


def _texto_opcional(valor: str | None) -> str | None:
    """Convierte un texto vacío en nulo, para no guardar cadenas en blanco."""
    return valor or None


# ------------------------------------------------------------------- categorías
def list_categories(
    db: Session,
    tenant_id: int,
    *,
    search: str | None = None,
    include_inactive: bool = False,
) -> list[Category]:
    """Lista las categorías del local, ordenadas por nombre."""
    condiciones = [Category.tenant_id == tenant_id]
    if not include_inactive:
        condiciones.append(Category.is_active.is_(True))
    if search:
        condiciones.append(Category.name.ilike(_patron_busqueda(search), escape="\\"))

    return list(
        db.scalars(select(Category).where(*condiciones).order_by(Category.name, Category.id))
    )


def get_category(db: Session, tenant_id: int, category_id: int) -> Category:
    """Devuelve una categoría del local o levanta 404."""
    category = db.scalar(
        select(Category).where(Category.id == category_id, Category.tenant_id == tenant_id)
    )
    if category is None:
        raise NotFoundError("Categoría no encontrada")
    return category


def _verificar_nombre_libre(
    db: Session, tenant_id: int, name: str, *, excluir_id: int | None = None
) -> None:
    """Impide repetir el nombre de una categoría dentro del mismo local."""
    condiciones = [Category.tenant_id == tenant_id, func.lower(Category.name) == name.lower()]
    if excluir_id is not None:
        condiciones.append(Category.id != excluir_id)

    if db.scalar(select(Category.id).where(*condiciones).limit(1)) is not None:
        raise ConflictError(f"Ya existe una categoría llamada «{name}» en este local")


def create_category(db: Session, tenant_id: int, data: CategoryCreate) -> Category:
    """Crea una categoría en el local."""
    _verificar_nombre_libre(db, tenant_id, data.name)

    category = Category(tenant_id=tenant_id, name=data.name)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(
    db: Session, tenant_id: int, category_id: int, data: CategoryUpdate
) -> Category:
    """Edita una categoría. También sirve para reactivarla."""
    category = get_category(db, tenant_id, category_id)
    cambios = data.model_dump(exclude_unset=True)

    if "name" in cambios and cambios["name"] != category.name:
        _verificar_nombre_libre(db, tenant_id, cambios["name"], excluir_id=category.id)

    for campo, valor in cambios.items():
        setattr(category, campo, valor)

    db.commit()
    db.refresh(category)
    return category


def deactivate_category(db: Session, tenant_id: int, category_id: int) -> Category:
    """Desactiva una categoría (borrado lógico): los productos la conservan."""
    category = get_category(db, tenant_id, category_id)
    category.is_active = False
    db.commit()
    db.refresh(category)
    return category


# -------------------------------------------------------------------- productos
def _verificar_categoria(db: Session, tenant_id: int, category_id: int | None) -> None:
    """Comprueba que la categoría indicada sea del mismo local."""
    if category_id is None:
        return

    existe = db.scalar(
        select(Category.id).where(
            Category.id == category_id, Category.tenant_id == tenant_id
        )
    )
    if existe is None:
        raise DomainError("La categoría indicada no existe en este local")


def list_products(
    db: Session,
    tenant_id: int,
    *,
    search: str | None = None,
    category_id: int | None = None,
    include_inactive: bool = False,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Product], int]:
    """Lista los productos del local con búsqueda, filtro y paginación.

    Devuelve la página pedida y el total de coincidencias (sin paginar).
    """
    condiciones = [Product.tenant_id == tenant_id]
    if not include_inactive:
        condiciones.append(Product.is_active.is_(True))
    if category_id is not None:
        condiciones.append(Product.category_id == category_id)
    if search:
        condiciones.append(Product.name.ilike(_patron_busqueda(search), escape="\\"))

    total = db.scalar(select(func.count()).select_from(Product).where(*condiciones)) or 0
    items = list(
        db.scalars(
            select(Product)
            .where(*condiciones)
            .order_by(Product.name, Product.id)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    )
    return items, total


def get_product(db: Session, tenant_id: int, product_id: int) -> Product:
    """Devuelve un producto del local o levanta 404.

    Se devuelve aunque esté desactivado: así el cliente puede consultarlo y
    volver a activarlo.
    """
    product = db.scalar(
        select(Product).where(Product.id == product_id, Product.tenant_id == tenant_id)
    )
    if product is None:
        raise NotFoundError("Producto no encontrado")
    return product


def create_product(db: Session, tenant_id: int, data: ProductCreate) -> Product:
    """Crea un producto. El stock nace en cero y lo mueve el módulo stock."""
    _verificar_categoria(db, tenant_id, data.category_id)

    product = Product(
        tenant_id=tenant_id,
        stock=0,
        **data.model_dump(exclude={"description", "image_url"}),
        description=_texto_opcional(data.description),
        image_url=_texto_opcional(data.image_url),
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def update_product(
    db: Session, tenant_id: int, product_id: int, data: ProductUpdate
) -> Product:
    """Edita un producto. También sirve para reactivarlo."""
    product = get_product(db, tenant_id, product_id)
    cambios = data.model_dump(exclude_unset=True)

    if "category_id" in cambios:
        _verificar_categoria(db, tenant_id, cambios["category_id"])
    for campo in ("description", "image_url"):
        if campo in cambios:
            cambios[campo] = _texto_opcional(cambios[campo])

    for campo, valor in cambios.items():
        setattr(product, campo, valor)

    db.commit()
    db.refresh(product)
    return product


def deactivate_product(db: Session, tenant_id: int, product_id: int) -> Product:
    """Desactiva un producto (borrado lógico): no se borra ni sale del historial."""
    product = get_product(db, tenant_id, product_id)
    product.is_active = False
    db.commit()
    db.refresh(product)
    return product


# ----------------------------------------------------------------------- fotos
def prepare_image(raw: bytes) -> bytes:
    """Valida la foto (tamaño y tipo real) y la deja en webp de 1200 px máximo.

    Se mira el contenido de verdad con Pillow, no la extensión ni lo que diga el
    navegador: un archivo disfrazado se rechaza.
    """
    if len(raw) > MAX_IMAGE_BYTES:
        raise TooLargeError("La foto no puede pasar de 3 MB")
    try:
        original = Image.open(BytesIO(raw))
        original.verify()  # comprueba que el archivo esté completo
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError):
        raise DomainError("El archivo no es una imagen válida")
    imagen = Image.open(BytesIO(raw))  # verify() cierra: hay que reabrir
    if imagen.format not in IMAGE_FORMATS:
        raise UnsupportedTypeError("La foto debe ser jpg, png o webp")
    if imagen.mode == "P":
        imagen = imagen.convert("RGBA")  # paleta: se conserva la transparencia
    elif imagen.mode not in ("RGB", "RGBA"):
        imagen = imagen.convert("RGB")
    if imagen.width > MAX_IMAGE_WIDTH:
        alto = round(imagen.height * MAX_IMAGE_WIDTH / imagen.width)
        imagen = imagen.resize((MAX_IMAGE_WIDTH, alto), Image.LANCZOS)
    salida = BytesIO()
    imagen.save(salida, format="WEBP", quality=82, method=6)
    return salida.getvalue()


def set_product_image(db: Session, tenant_id: int, product_id: int, raw: bytes) -> Product:
    """Sube la foto del producto a Azure y guarda su URL (borra la anterior).

    La foto queda en `<tenant>/<uuid>.webp`. La anterior se borra después de
    guardar la nueva: si el borrado falla, la foto igual quedó reemplazada.
    """
    product = get_product(db, tenant_id, product_id)
    foto = prepare_image(raw)
    anterior = product.image_url
    product.image_url = blob_storage.upload_image(f"{tenant_id}/{uuid4().hex}.webp", foto)
    db.commit()
    db.refresh(product)
    if anterior and anterior != product.image_url:
        blob_storage.delete_image(anterior)
    return product
