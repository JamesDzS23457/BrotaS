"""Pruebas de la guardia de tenant y del aislamiento de datos entre locales."""
from collections.abc import Callable

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.auth.models import User, UserRole
from app.modules.products.models import Product
from app.modules.tenants.models import Tenant, TenantStatus


def test_un_local_no_ve_los_productos_de_otro(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """Un usuario del local A solo ve los productos del local A."""
    local_a = crear_local("Florería A", "floreria-a")
    local_b = crear_local("Florería B", "floreria-b")
    crear_usuario("ana@floreria-a.co", local_a.id)
    crear_usuario("beto@floreria-b.co", local_b.id)
    crear_producto(local_a.id, "Rosa roja")
    crear_producto(local_a.id, "Tulipán")
    crear_producto(local_b.id, "Girasol")

    datos_a = client.get("/api/v1/florist/products", headers=autenticar("ana@floreria-a.co")).json()
    datos_b = client.get("/api/v1/florist/products", headers=autenticar("beto@floreria-b.co")).json()

    assert {p["name"] for p in datos_a["items"]} == {"Rosa roja", "Tulipán"}
    assert {p["name"] for p in datos_b["items"]} == {"Girasol"}
    assert datos_a["total"] == 2
    assert datos_b["total"] == 1
    # Cada producto viene marcado con el local que corresponde
    assert all(p["tenant_id"] == local_a.id for p in datos_a["items"])
    assert all(p["tenant_id"] == local_b.id for p in datos_b["items"])


def test_local_suspendido_recibe_403(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """Un local suspendido no puede usar los endpoints de negocio."""
    suspendido = crear_local("Florería Suspendida", "floreria-susp", TenantStatus.SUSPENDED)
    crear_usuario("dueno@susp.co", suspendido.id)
    crear_producto(suspendido.id, "Clavel")

    respuesta = client.get("/api/v1/florist/products", headers=autenticar("dueno@susp.co"))

    assert respuesta.status_code == 403
    assert "suspendido" in respuesta.json()["detail"].lower()


def test_usuario_sin_local_recibe_403(
    crear_usuario: Callable[..., User],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """El superadmin (sin local) no accede a endpoints de negocio."""
    crear_usuario("root@plataforma.co", None)

    respuesta = client.get("/api/v1/florist/products", headers=autenticar("root@plataforma.co"))

    assert respuesta.status_code == 403
    assert "local" in respuesta.json()["detail"].lower()


def test_sin_token_recibe_401(client: TestClient) -> None:
    """Sin token no se puede llamar un endpoint protegido."""
    assert client.get("/api/v1/florist/products").status_code == 401


def test_staff_puede_leer_pero_no_escribir_en_categorias(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """El rol staff solo lee: cualquier escritura sobre categorías da 403."""
    local = crear_local("Florería Staff", "floreria-staff")
    crear_usuario("empleada@staff.co", local.id, UserRole.STAFF)
    cabeceras = autenticar("empleada@staff.co")

    assert client.get("/api/v1/florist/categories", headers=cabeceras).status_code == 200
    assert (
        client.post("/api/v1/florist/categories", json={"name": "Ramos"}, headers=cabeceras).status_code
        == 403
    )
    assert (
        client.patch("/api/v1/florist/categories/1", json={"name": "Otro"}, headers=cabeceras).status_code
        == 403
    )
    assert client.delete("/api/v1/florist/categories/1", headers=cabeceras).status_code == 403
