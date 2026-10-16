"""Pruebas de la subida de fotos de productos (Prompt 1.2).

Azure se simula: se interceptan la subida y el borrado en memoria, así estas
pruebas no necesitan ni red ni credenciales.
"""
import io
import os
from collections.abc import Callable
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.modules.auth.models import User, UserRole
from app.modules.products import service as product_service
from app.modules.products.models import Product
from app.modules.products.service import MAX_IMAGE_BYTES
from app.modules.tenants.models import Tenant


def _foto(formato: str = "PNG", ancho: int = 800, alto: int = 600) -> bytes:
    """Genera una foto válida en memoria."""
    imagen = Image.new("RGB", (ancho, alto), (200, 30, 120))
    buffer = io.BytesIO()
    imagen.save(buffer, format=formato)
    return buffer.getvalue()


def _foto_ruidosa(ancho: int = 1200, alto: int = 1200) -> bytes:
    """Genera una foto que sí pesa más de 3 MB (el ruido no comprime)."""
    imagen = Image.frombytes("RGB", (ancho, alto), os.urandom(ancho * alto * 3))
    buffer = io.BytesIO()
    imagen.save(buffer, format="PNG")
    datos = buffer.getvalue()
    assert len(datos) > MAX_IMAGE_BYTES, "la foto de prueba debe pasar de 3 MB"
    return datos


@pytest.fixture
def almacenamiento(monkeypatch: pytest.MonkeyPatch) -> SimpleNamespace:
    """Simula Azure: guarda lo subido en memoria y anota lo borrado."""
    estado = SimpleNamespace(subidas={}, borradas=[])

    def _subir(ruta: str, datos: bytes) -> str:
        estado.subidas[ruta] = datos
        return f"https://cuenta.blob.core.windows.net/productos/{ruta}"

    def _borrar(url: str) -> bool:
        estado.borradas.append(url)
        return True

    monkeypatch.setattr(product_service.blob_storage, "upload_image", _subir)
    monkeypatch.setattr(product_service.blob_storage, "delete_image", _borrar)
    return estado


@pytest.fixture
def local_dueno(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    autenticar: Callable[[str], dict[str, str]],
) -> tuple[Tenant, dict[str, str]]:
    """Un local con su dueño autenticado."""
    local = crear_local("Florería", "floreria")
    crear_usuario("duena@floreria.co", local.id)
    return local, autenticar("duena@floreria.co")


def test_owner_sube_foto_y_queda_en_webp_de_1200(
    local_dueno: tuple[Tenant, dict[str, str]],
    crear_producto: Callable[..., Product],
    almacenamiento: SimpleNamespace,
    client: TestClient,
) -> None:
    """La foto se convierte a webp y se achica a 1200 px de ancho."""
    local, cabeceras = local_dueno
    producto = crear_producto(local.id, "Rosa roja")

    respuesta = client.post(
        f"/api/v1/products/{producto.id}/image",
        files={"file": ("foto.png", _foto(ancho=2000, alto=1500), "image/png")},
        headers=cabeceras,
    )

    assert respuesta.status_code == 200, respuesta.text
    url = respuesta.json()["image_url"]
    assert url.startswith("https://cuenta.blob.core.windows.net/productos/")
    assert url.endswith(".webp")
    ruta = url.split("/productos/", 1)[1]
    assert ruta.startswith(f"{local.id}/")  # carpeta del local
    guardada = Image.open(io.BytesIO(almacenamiento.subidas[ruta]))
    assert guardada.format == "WEBP"
    assert guardada.width == 1200  # la original era de 2000 px


def test_archivo_que_no_es_imagen_da_400(
    local_dueno: tuple[Tenant, dict[str, str]],
    crear_producto: Callable[..., Product],
    almacenamiento: SimpleNamespace,
    client: TestClient,
) -> None:
    """Un texto disfrazado de png se rechaza mirando el contenido real."""
    local, cabeceras = local_dueno
    producto = crear_producto(local.id, "Rosa roja")

    respuesta = client.post(
        f"/api/v1/products/{producto.id}/image",
        files={"file": ("foto.png", "no soy una foto".encode(), "image/png")},
        headers=cabeceras,
    )

    assert respuesta.status_code == 400
    assert almacenamiento.subidas == {}


def test_foto_muy_grande_da_413(
    local_dueno: tuple[Tenant, dict[str, str]],
    crear_producto: Callable[..., Product],
    almacenamiento: SimpleNamespace,
    client: TestClient,
) -> None:
    """Más de 3 MB se rechaza antes de procesar."""
    local, cabeceras = local_dueno
    producto = crear_producto(local.id, "Rosa roja")

    respuesta = client.post(
        f"/api/v1/products/{producto.id}/image",
        files={"file": ("grande.png", _foto_ruidosa(), "image/png")},
        headers=cabeceras,
    )

    assert respuesta.status_code == 413
    assert almacenamiento.subidas == {}


def test_reemplazar_borra_la_foto_anterior_nuestra(
    local_dueno: tuple[Tenant, dict[str, str]],
    crear_producto: Callable[..., Product],
    almacenamiento: SimpleNamespace,
    client: TestClient,
) -> None:
    """Al cambiar la foto, la anterior (si era nuestra) se borra de Azure."""
    local, cabeceras = local_dueno
    producto = crear_producto(local.id, "Rosa roja")
    vieja = f"https://cuenta.blob.core.windows.net/productos/{local.id}/vieja.webp"
    client.patch(
        f"/api/v1/products/{producto.id}", json={"image_url": vieja}, headers=cabeceras
    )

    respuesta = client.post(
        f"/api/v1/products/{producto.id}/image",
        files={"file": ("nueva.png", _foto(), "image/png")},
        headers=cabeceras,
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["image_url"] != vieja
    assert almacenamiento.borradas == [vieja]


def test_foto_anterior_externa_no_se_borra(
    local_dueno: tuple[Tenant, dict[str, str]],
    crear_producto: Callable[..., Product],
    monkeypatch: pytest.MonkeyPatch,
    client: TestClient,
) -> None:
    """Si la foto anterior era una URL de otro lado, no se toca (se usa el borrado real)."""
    subidas: dict[str, bytes] = {}

    def _subir(ruta: str, datos: bytes) -> str:
        subidas[ruta] = datos
        return f"https://cuenta.blob.core.windows.net/productos/{ruta}"

    monkeypatch.setattr(product_service.blob_storage, "upload_image", _subir)
    local, cabeceras = local_dueno
    producto = crear_producto(local.id, "Rosa roja")
    client.patch(
        f"/api/v1/products/{producto.id}",
        json={"image_url": "https://ejemplo.com/foto.jpg"},
        headers=cabeceras,
    )

    respuesta = client.post(
        f"/api/v1/products/{producto.id}/image",
        files={"file": ("nueva.png", _foto(), "image/png")},
        headers=cabeceras,
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["image_url"].endswith(".webp")
    assert len(subidas) == 1  # solo la nueva; la externa sigue intacta donde esté


def test_sin_azure_configurado_da_503(
    local_dueno: tuple[Tenant, dict[str, str]],
    crear_producto: Callable[..., Product],
    monkeypatch: pytest.MonkeyPatch,
    client: TestClient,
) -> None:
    """Sin cadena de conexión, el endpoint avisa en vez de reventar."""
    from types import SimpleNamespace as NS

    monkeypatch.setattr(
        product_service.blob_storage,
        "get_settings",
        lambda: NS(azure_storage_connection_string="", azure_storage_container="productos"),
    )
    local, cabeceras = local_dueno
    producto = crear_producto(local.id, "Rosa roja")

    respuesta = client.post(
        f"/api/v1/products/{producto.id}/image",
        files={"file": ("foto.png", _foto(), "image/png")},
        headers=cabeceras,
    )

    assert respuesta.status_code == 503


def test_staff_no_puede_subir_foto(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    almacenamiento: SimpleNamespace,
    client: TestClient,
) -> None:
    """El rol staff lee pero no sube fotos."""
    local = crear_local("Florería", "floreria")
    crear_usuario("empleada@floreria.co", local.id, UserRole.STAFF)
    producto = crear_producto(local.id, "Rosa roja")

    respuesta = client.post(
        f"/api/v1/products/{producto.id}/image",
        files={"file": ("foto.png", _foto(), "image/png")},
        headers=autenticar("empleada@floreria.co"),
    )

    assert respuesta.status_code == 403
    assert almacenamiento.subidas == {}


def test_foto_de_otro_local_da_404(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    almacenamiento: SimpleNamespace,
    client: TestClient,
) -> None:
    """Un local no puede ponerle foto a productos ajenos (ni a ids fantasmas)."""
    local_a = crear_local("Florería A", "floreria-a")
    local_b = crear_local("Florería B", "floreria-b")
    crear_usuario("dueno@b.co", local_b.id)
    cabeceras_b = autenticar("dueno@b.co")
    producto = crear_producto(local_a.id, "Rosa roja")

    assert (
        client.post(
            f"/api/v1/products/{producto.id}/image",
            files={"file": ("foto.png", _foto(), "image/png")},
            headers=cabeceras_b,
        ).status_code
        == 404
    )
    assert (
        client.post(
            "/api/v1/products/999999/image",
            files={"file": ("foto.png", _foto(), "image/png")},
            headers=cabeceras_b,
        ).status_code
        == 404
    )
    assert almacenamiento.subidas == {}


def test_subir_sin_token_da_401(
    crear_local: Callable[..., Tenant],
    crear_producto: Callable[..., Product],
    almacenamiento: SimpleNamespace,
    client: TestClient,
) -> None:
    """Sin token no se puede subir fotos."""
    local = crear_local("Florería", "floreria")
    producto = crear_producto(local.id, "Rosa roja")

    respuesta = client.post(
        f"/api/v1/products/{producto.id}/image",
        files={"file": ("foto.png", _foto(), "image/png")},
    )

    assert respuesta.status_code == 401
    assert almacenamiento.subidas == {}
