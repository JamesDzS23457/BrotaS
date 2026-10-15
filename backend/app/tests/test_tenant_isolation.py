"""Pruebas de la guardia de tenant y del aislamiento de datos entre locales."""
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.modules.auth.models import User, UserRole
from app.modules.products.models import Product
from app.modules.tenants.models import Tenant, TenantStatus

PASSWORD = "clave1234"


def _local(db: Session, nombre: str, slug: str, status: TenantStatus = TenantStatus.ACTIVE) -> Tenant:
    """Crea un local de prueba."""
    tenant = Tenant(name=nombre, slug=slug, status=status)
    db.add(tenant)
    db.flush()
    return tenant


def _usuario(db: Session, email: str, tenant_id: int | None) -> User:
    """Crea un usuario de prueba."""
    user = User(
        tenant_id=tenant_id,
        email=email,
        password_hash=hash_password(PASSWORD),
        role=UserRole.OWNER if tenant_id else UserRole.SUPERADMIN,
    )
    db.add(user)
    db.flush()
    return user


def _producto(db: Session, tenant_id: int | None, nombre: str) -> Product:
    """Crea un producto de prueba."""
    product = Product(tenant_id=tenant_id, name=nombre, price=1000, stock=5)
    db.add(product)
    db.flush()
    return product


def _cabeceras(client: TestClient, email: str) -> dict[str, str]:
    """Inicia sesión y devuelve la cabecera Authorization."""
    respuesta = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert respuesta.status_code == 200, respuesta.text
    return {"Authorization": f"Bearer {respuesta.json()['access_token']}"}


def test_un_local_no_ve_los_productos_de_otro(db: Session, client: TestClient) -> None:
    """Un usuario del local A solo ve los productos del local A."""
    local_a = _local(db, "Florería A", "floreria-a")
    local_b = _local(db, "Florería B", "floreria-b")
    _usuario(db, "ana@floreria-a.co", local_a.id)
    _usuario(db, "beto@floreria-b.co", local_b.id)
    _producto(db, local_a.id, "Rosa roja")
    _producto(db, local_a.id, "Tulipán")
    _producto(db, local_b.id, "Girasol")

    datos_a = client.get("/api/v1/products", headers=_cabeceras(client, "ana@floreria-a.co")).json()
    datos_b = client.get("/api/v1/products", headers=_cabeceras(client, "beto@floreria-b.co")).json()

    assert {p["name"] for p in datos_a} == {"Rosa roja", "Tulipán"}
    assert {p["name"] for p in datos_b} == {"Girasol"}
    # Cada producto viene marcado con el local que corresponde
    assert all(p["tenant_id"] == local_a.id for p in datos_a)
    assert all(p["tenant_id"] == local_b.id for p in datos_b)


def test_local_suspendido_recibe_403(db: Session, client: TestClient) -> None:
    """Un local suspendido no puede usar los endpoints de negocio."""
    suspendido = _local(db, "Florería Suspendida", "floreria-susp", TenantStatus.SUSPENDED)
    _usuario(db, "dueño@susp.co", suspendido.id)
    _producto(db, suspendido.id, "Clavel")

    respuesta = client.get("/api/v1/products", headers=_cabeceras(client, "dueño@susp.co"))

    assert respuesta.status_code == 403
    assert "suspendido" in respuesta.json()["detail"].lower()


def test_usuario_sin_local_recibe_403(db: Session, client: TestClient) -> None:
    """El superadmin (sin local) no accede a endpoints de negocio."""
    _usuario(db, "root@plataforma.co", None)

    respuesta = client.get("/api/v1/products", headers=_cabeceras(client, "root@plataforma.co"))

    assert respuesta.status_code == 403
    assert "local" in respuesta.json()["detail"].lower()


def test_sin_token_recibe_401(client: TestClient) -> None:
    """Sin token no se puede llamar un endpoint protegido."""
    assert client.get("/api/v1/products").status_code == 401
