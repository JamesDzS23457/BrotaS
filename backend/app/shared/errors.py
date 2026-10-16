"""Errores de dominio compartidos.

Los servicios levantan estas excepciones sin saber nada de HTTP; ``main.py`` las
traduce a respuestas con el mismo formato que usa FastAPI: ``{"detail": "..."}``.
"""


class DomainError(Exception):
    """Error de negocio, con el código HTTP que le corresponde."""

    status_code = 400

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class NotFoundError(DomainError):
    """El recurso no existe o no pertenece al local del usuario."""

    status_code = 404


class ConflictError(DomainError):
    """El recurso choca con otro que ya existe."""

    status_code = 409


class TooLargeError(DomainError):
    """El archivo enviado supera el tamaño permitido."""

    status_code = 413


class UnsupportedTypeError(DomainError):
    """El tipo de archivo no está permitido."""

    status_code = 415


class StorageNotConfiguredError(DomainError):
    """Falta configurar el almacenamiento de fotos."""

    status_code = 503
