"""Pruebas de la plataforma por aplicaciones (prefijo florist, planes y zona horaria)."""
from collections.abc import Callable
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.modules.auth.models import User
from app.modules.products.models import Product
from app.modules.sales.models import Sale
from app.modules.tenants.models import Tenant, TenantApp


def _local_dueno(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    autenticar: Callable[[str], dict[str, str]],
    slug: str = "floreria",
) -> tuple[Tenant, dict[str, str]]:
    """Un local con su dueño autenticado (con la app florist contratada)."""
    local = crear_local("Florería", slug)
    email = f"duena@{slug}.co"
    crear_usuario(email, local.id)
    return local, autenticar(email)


def test_sin_app_contratada_da_403(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    autenticar: Callable[[str], dict[str, str]],
    db: Session,
    client: TestClient,
) -> None:
    """Un local sin la app florist no entra a sus endpoints aunque esté activo."""
    local = crear_local("Florería", "floreria")
    crear_usuario("duena@floreria.co", local.id)
    db.query(TenantApp).filter_by(tenant_id=local.id).delete()

    respuesta = client.get(
        "/api/v1/florist/products", headers=autenticar("duena@floreria.co")
    )

    assert respuesta.status_code == 403
    assert "aplicación" in respuesta.json()["detail"].lower()


def test_plan_inventario_no_publica_pero_completo_si(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    autenticar: Callable[[str], dict[str, str]],
    db: Session,
    client: TestClient,
) -> None:
    """Publicar exige la función `pagina`: el plan inventario la rechaza con 400."""
    local, cabeceras = _local_dueno(crear_local, crear_usuario, autenticar)

    rechazado = client.post(
        "/api/v1/florist/products",
        json={"name": "Rosa", "price": "1000.00", "is_published": True},
        headers=cabeceras,
    )
    assert rechazado.status_code == 400

    db.query(TenantApp).filter_by(tenant_id=local.id).update({"plan": "completo"})
    permitido = client.post(
        "/api/v1/florist/products",
        json={"name": "Rosa", "price": "1000.00", "is_published": True},
        headers=cabeceras,
    )
    assert permitido.status_code == 201, permitido.text
    assert permitido.json()["is_published"] is True


def test_reporte_usa_la_zona_del_local(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    db: Session,
    client: TestClient,
) -> None:
    """Una venta de las 02:00 UTC es del día 10 en Kiritimati (+14) y del 9 en Bogotá."""
    local, cabeceras = _local_dueno(crear_local, crear_usuario, autenticar)
    _local_dueno(crear_local, crear_usuario, autenticar, slug="floreria-b")
    db.query(Tenant).filter_by(id=local.id).update({"timezone": "Pacific/Kiritimati"})
    producto = crear_producto(local.id, "Rosa roja", precio=2500, stock=10)
    venta = client.post(
        "/api/v1/florist/sales",
        json={"items": [{"product_id": producto.id, "quantity": 1}], "payment_method": "efectivo"},
        headers=cabeceras,
    ).json()
    db.execute(
        update(Sale)
        .where(Sale.id == venta["id"])
        .values(created_at=datetime(2020, 5, 10, 2, 0, tzinfo=ZoneInfo("UTC")))
    )

    assert (
        client.get(
            "/api/v1/florist/reports/daily", params={"date": "2020-05-10"}, headers=cabeceras
        ).json()["sales_count"]
        == 1
    )
    cabeceras_b = autenticar("duena@floreria-b.co")
    assert (
        client.get(
            "/api/v1/florist/reports/daily", params={"date": "2020-05-10"}, headers=cabeceras_b
        ).json()["sales_count"]
        == 0  # en Bogotá esa venta cayó el día 9
    )


def test_perfil_trae_moneda_y_zona(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """/me trae la moneda y la zona del local para no escribirlas a mano."""
    _, cabeceras = _local_dueno(crear_local, crear_usuario, autenticar)

    datos = client.get("/api/v1/auth/me", headers=cabeceras).json()

    assert datos["currency"] == "COP"
    assert datos["timezone"] == "America/Bogota"
