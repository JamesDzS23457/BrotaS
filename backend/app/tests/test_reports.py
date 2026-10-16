"""Pruebas del reporte del día (Prompt 1.5)."""
from collections.abc import Callable
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.modules.auth.models import User, UserRole
from app.modules.products.models import Product
from app.modules.sales.models import Sale
from app.modules.tenants.models import Tenant

BOGOTA = ZoneInfo("America/Bogota")


def _local_dueno(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    autenticar: Callable[[str], dict[str, str]],
    slug: str = "floreria",
) -> tuple[Tenant, dict[str, str]]:
    """Un local con su dueño autenticado."""
    local = crear_local("Florería", slug)
    email = f"duena@{slug}.co"
    crear_usuario(email, local.id)
    return local, autenticar(email)


def _vender(client: TestClient, cabeceras: dict[str, str], items: list[dict]) -> dict:
    """Registra una venta y la devuelve."""
    respuesta = client.post(
        "/api/v1/sales",
        json={"items": items, "payment_method": "efectivo"},
        headers=cabeceras,
    )
    assert respuesta.status_code == 201, respuesta.text
    return respuesta.json()


def test_reporte_del_dia_con_ventas(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """Total, conteo, top agregado y stock bajo del día."""
    local, cabeceras = _local_dueno(crear_local, crear_usuario, autenticar)
    rosa = crear_producto(local.id, "Rosa roja", precio=2500, stock=100, min_stock=5)
    clavel = crear_producto(local.id, "Clavel", precio=1800, stock=100, min_stock=200)
    _vender(client, cabeceras, [{"product_id": rosa.id, "quantity": 2}])
    _vender(client, cabeceras, [{"product_id": rosa.id, "quantity": 1}, {"product_id": clavel.id, "quantity": 4}])

    hoy = datetime.now(BOGOTA).date().isoformat()
    respuesta = client.get("/api/v1/reports/daily", params={"date": hoy}, headers=cabeceras)

    assert respuesta.status_code == 200, respuesta.text
    datos = respuesta.json()
    assert datos["date"] == hoy
    assert datos["total_sold"] == "14700.00"  # 3*2500 + 4*1800
    assert datos["sales_count"] == 2
    assert [(t["name"], t["quantity"], t["revenue"]) for t in datos["top_products"]] == [
        ("Clavel", 4, "7200.00"),
        ("Rosa roja", 3, "7500.00"),
    ]
    # El clavel quedó en 96 <= 200: sale en stock bajo; la rosa (97 > 5) no
    assert [p["name"] for p in datos["low_stock"]] == ["Clavel"]


def test_top_corta_en_cinco(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """Aunque se vendan 6 productos, el top trae 5."""
    local, cabeceras = _local_dueno(crear_local, crear_usuario, autenticar)
    ids = [
        crear_producto(local.id, f"Flor {i}", precio=1000, stock=100).id for i in range(6)
    ]
    _vender(client, cabeceras, [{"product_id": pid, "quantity": 1} for pid in ids])

    hoy = datetime.now(BOGOTA).date().isoformat()
    datos = client.get("/api/v1/reports/daily", params={"date": hoy}, headers=cabeceras).json()

    assert len(datos["top_products"]) == 5
    assert datos["sales_count"] == 1


def test_dia_sin_ventas_da_ceros(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """Un día vacío responde ceros y listas vacías, no errores."""
    _, cabeceras = _local_dueno(crear_local, crear_usuario, autenticar)

    datos = client.get(
        "/api/v1/reports/daily", params={"date": "2020-01-15"}, headers=cabeceras
    ).json()

    assert datos["total_sold"] == "0"
    assert datos["sales_count"] == 0
    assert datos["top_products"] == []
    assert datos["low_stock"] == []


def test_solo_cuenta_las_ventas_de_ese_dia_y_ese_local(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    db: Session,
    client: TestClient,
) -> None:
    """Las ventas de otro día u otro local no entran al reporte."""
    local, cabeceras = _local_dueno(crear_local, crear_usuario, autenticar)
    otro, _ = _local_dueno(crear_local, crear_usuario, autenticar, slug="floreria-b")
    rosa = crear_producto(local.id, "Rosa roja", precio=2500, stock=100)
    ajena = crear_producto(otro.id, "Girasol", precio=1000, stock=100)

    vieja = _vender(client, cabeceras, [{"product_id": rosa.id, "quantity": 2}])
    db.execute(
        update(Sale)
        .where(Sale.id == vieja["id"])
        .values(created_at=datetime(2020, 5, 10, 12, 0, tzinfo=BOGOTA))
    )
    _vender(
        client,
        autenticar("duena@floreria-b.co"),
        [{"product_id": ajena.id, "quantity": 7}],
    )

    datos = client.get(
        "/api/v1/reports/daily", params={"date": "2020-05-10"}, headers=cabeceras
    ).json()

    assert datos["total_sold"] == "5000.00"
    assert datos["sales_count"] == 1
    assert [(t["name"], t["quantity"]) for t in datos["top_products"]] == [("Rosa roja", 2)]


def test_reporte_exige_login_y_fecha_valida(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """Sin token 401; sin fecha o con fecha mala, 422. El empleado sí puede verlo."""
    local = crear_local("Florería", "floreria")
    crear_usuario("empleada@floreria.co", local.id, UserRole.STAFF)
    cabeceras = autenticar("empleada@floreria.co")
    hoy = datetime.now(BOGOTA).date().isoformat()

    assert client.get("/api/v1/reports/daily", params={"date": hoy}).status_code == 401
    assert client.get("/api/v1/reports/daily", headers=cabeceras).status_code == 422
    assert (
        client.get("/api/v1/reports/daily", params={"date": "ayer"}, headers=cabeceras).status_code
        == 422
    )
    assert (
        client.get("/api/v1/reports/daily", params={"date": hoy}, headers=cabeceras).status_code
        == 200
    )
