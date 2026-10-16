"""Pruebas del login y del perfil del usuario autenticado."""
from collections.abc import Callable

from fastapi.testclient import TestClient

from app.modules.auth.models import User
from app.modules.tenants.models import Tenant


def test_login_devuelve_token_y_perfil_muestra_el_correo(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """El perfil del autenticado trae su correo, su local y su rol."""
    local = crear_local("Florería", "floreria")
    crear_usuario("duena@floreria.co", local.id)

    respuesta = client.get("/api/v1/auth/me", headers=autenticar("duena@floreria.co"))

    assert respuesta.status_code == 200
    datos = respuesta.json()
    assert datos["email"] == "duena@floreria.co"
    assert datos["tenant_id"] == local.id
    assert datos["role"] == "owner"


def test_perfil_sin_token_da_401(client: TestClient) -> None:
    """Sin token no se puede consultar el perfil."""
    assert client.get("/api/v1/auth/me").status_code == 401
