"""Fotos en Azure Blob Storage.

Todo lo que toca Azure vive aquí: el servicio de productos solo pide subir o
borrar, sin conocer el SDK. Las fotos quedan en `<contenedor>/<tenant>/<uuid>.webp`.
"""
import logging
from urllib.parse import urlparse

from azure.core.exceptions import ResourceExistsError, ResourceNotFoundError
from azure.storage.blob import BlobServiceClient, ContentSettings

from app.core.config import get_settings
from app.shared.errors import StorageNotConfiguredError

log = logging.getLogger(__name__)


def _cliente() -> tuple[BlobServiceClient, str]:
    """Devuelve el cliente de Azure y el contenedor, o levanta 503 si falta config."""
    config = get_settings()
    if not config.azure_storage_connection_string:
        raise StorageNotConfiguredError(
            "El almacenamiento de fotos no está configurado "
            "(AZURE_STORAGE_CONNECTION_STRING)"
        )
    servicio = BlobServiceClient.from_connection_string(
        config.azure_storage_connection_string
    )
    return servicio, config.azure_storage_container


def upload_image(ruta_blob: str, datos: bytes) -> str:
    """Sube la foto (ya procesada en webp) y devuelve su URL pública.

    Crea el contenedor si no existe, con lectura pública de blobs (si no, la URL
    guardada no se podría ver).
    """
    servicio, contenedor = _cliente()
    try:
        servicio.create_container(contenedor, public_access="blob")
    except ResourceExistsError:
        pass
    blob = servicio.get_blob_client(container=contenedor, blob=ruta_blob)
    blob.upload_blob(
        datos,
        overwrite=True,
        content_settings=ContentSettings(content_type="image/webp"),
    )
    return blob.url


def extract_blob_path(image_url: str, contenedor: str) -> str | None:
    """Saca la ruta del blob desde una URL nuestra; nulo si la foto es externa."""
    try:
        ruta = urlparse(image_url).path
    except ValueError:
        return None
    marca = f"/{contenedor}/"
    if marca not in ruta:
        return None
    return ruta.split(marca, 1)[1] or None


def delete_image(image_url: str | None) -> bool:
    """Borra la foto anterior si vive en nuestro contenedor.

    Nunca falla: si es externa, si ya no existe o si no hay Azure configurado,
    devuelve falso y sigue (un blob huérfano no bloquea el reemplazo).
    """
    if not image_url:
        return False
    config = get_settings()
    if not config.azure_storage_connection_string:
        return False
    ruta_blob = extract_blob_path(image_url, config.azure_storage_container)
    if not ruta_blob:
        return False
    try:
        servicio = BlobServiceClient.from_connection_string(
            config.azure_storage_connection_string
        )
        servicio.get_blob_client(
            container=config.azure_storage_container, blob=ruta_blob
        ).delete_blob()
        return True
    except ResourceNotFoundError:
        return False
    except Exception:  # noqa: BLE001  (la foto ya quedó en base: se avisa y se sigue)
        log.warning("No se pudo borrar la foto anterior: %s", ruta_blob)
        return False
