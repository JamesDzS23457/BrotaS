"""Pruebas de las ventas (Prompt 1.4)."""
from collections.abc import Callable
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.modules.auth.models import User, UserRole
from app.modules.products.models import Product
from app.modules.sales.models import Sale
from app.modules.stock.models import StockMovement
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


def test_dueno_vende_y_todo_cuadra(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    db: Session,
    client: TestClient,
) -> None:
    """La venta descuenta stock, congela precios y registra movimientos."""
    local, cabeceras = _local_dueno(crear_local, crear_usuario, autenticar)
    rosa = crear_producto(local.id, "Rosa roja", precio=2500, stock=10)
    clavel = crear_producto(local.id, "Clavel", precio=1800, stock=10)

    respuesta = client.post(
        "/api/v1/sales",
        json={
            "items": [
                {"product_id": rosa.id, "quantity": 2},
                {"product_id": clavel.id, "quantity": 1},
            ],
            "payment_method": "efectivo",
        },
        headers=cabeceras,
    )

    assert respuesta.status_code == 201, respuesta.text
    datos = respuesta.json()
    assert datos["total"] == "6800.00"  # 2*2500 + 1*1800
    assert datos["payment_method"] == "efectivo"
    assert datos["user_id"] is not None
    assert [(i["product_id"], i["quantity"], i["unit_price"]) for i in datos["items"]] == [
        (rosa.id, 2, "2500.00"),
        (clavel.id, 1, "1800.00"),
    ]
    db.refresh(rosa)
    db.refresh(clavel)
    assert (rosa.stock, clavel.stock) == (8, 9)
    movimientos = list(
        db.scalars(
            select(StockMovement).where(
                StockMovement.product_id.in_([rosa.id, clavel.id])
            )
        )
    )
    assert sorted(m.quantity_change for m in movimientos) == [-2, -1]
    assert {m.reason for m in movimientos} == {"venta"}


def test_item_con_precio_congelado(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """Si el precio cambia después, la venta vieja conserva el de ese día."""
    local, cabeceras = _local_dueno(crear_local, crear_usuario, autenticar)
    producto = crear_producto(local.id, "Rosa roja", precio=2500, stock=10)

    primera = client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": producto.id, "quantity": 1}], "payment_method": "tarjeta"},
        headers=cabeceras,
    ).json()
    client.patch(
        f"/api/v1/products/{producto.id}", json={"price": "3200.00"}, headers=cabeceras
    )
    segunda = client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": producto.id, "quantity": 1}], "payment_method": "tarjeta"},
        headers=cabeceras,
    ).json()

    assert primera["items"][0]["unit_price"] == "2500.00"
    assert primera["total"] == "2500.00"
    assert segunda["items"][0]["unit_price"] == "3200.00"


def test_sin_stock_no_guarda_nada(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    db: Session,
    client: TestClient,
) -> None:
    """Si falta stock de un item, la venta entera se rechaza sin dejar rastro."""
    local, cabeceras = _local_dueno(crear_local, crear_usuario, autenticar)
    rosa = crear_producto(local.id, "Rosa roja", precio=2500, stock=10)
    crear_producto(local.id, "Clavel", precio=1800, stock=1)

    respuesta = client.post(
        "/api/v1/sales",
        json={
            "items": [
                {"product_id": rosa.id, "quantity": 2},
                {"product_id": rosa.id + 1, "quantity": 5},
            ],
            "payment_method": "efectivo",
        },
        headers=cabeceras,
    )

    assert respuesta.status_code == 400
    assert db.scalar(select(func.count()).select_from(Sale)) == 0
    db.refresh(rosa)
    assert rosa.stock == 10  # ni siquiera descontó el item que sí tenía
    assert db.scalar(select(func.count()).select_from(StockMovement)) == 0


def test_producto_inactivo_no_se_vende(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """Lo desactivado ya no está disponible para la venta."""
    local, cabeceras = _local_dueno(crear_local, crear_usuario, autenticar)
    producto = crear_producto(local.id, "Rosa roja", precio=2500, stock=10, is_active=False)

    respuesta = client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": producto.id, "quantity": 1}], "payment_method": "efectivo"},
        headers=cabeceras,
    )

    assert respuesta.status_code == 400


def test_venta_invalida_da_422_o_404(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """Cantidad cero, lista vacía, pago inventado y producto ajeno se rechazan."""
    local, cabeceras = _local_dueno(crear_local, crear_usuario, autenticar)
    _, cabeceras_b = _local_dueno(crear_local, crear_usuario, autenticar, slug="floreria-b")
    producto = crear_producto(local.id, "Rosa roja", precio=2500, stock=10)

    base = {"items": [{"product_id": producto.id, "quantity": 1}], "payment_method": "efectivo"}
    assert client.post("/api/v1/sales", json={**base, "items": []}, headers=cabeceras).status_code == 422
    assert (
        client.post(
            "/api/v1/sales",
            json={**base, "items": [{"product_id": producto.id, "quantity": 0}]},
            headers=cabeceras,
        ).status_code
        == 422
    )
    assert (
        client.post("/api/v1/sales", json={**base, "payment_method": "fiado"}, headers=cabeceras).status_code
        == 422
    )
    assert (
        client.post("/api/v1/sales", json=base, headers=cabeceras_b).status_code == 404
    )
    assert (
        client.post(
            "/api/v1/sales",
            json={**base, "items": [{"product_id": 999999, "quantity": 1}]},
            headers=cabeceras,
        ).status_code
        == 404
    )


def test_producto_repetido_se_suma_en_un_solo_item(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    db: Session,
    client: TestClient,
) -> None:
    """Si el producto viene dos veces, queda un item con la suma."""
    local, cabeceras = _local_dueno(crear_local, crear_usuario, autenticar)
    producto = crear_producto(local.id, "Rosa roja", precio=2500, stock=10)

    respuesta = client.post(
        "/api/v1/sales",
        json={
            "items": [
                {"product_id": producto.id, "quantity": 2},
                {"product_id": producto.id, "quantity": 3},
            ],
            "payment_method": "transferencia",
        },
        headers=cabeceras,
    )

    assert respuesta.status_code == 201
    assert len(respuesta.json()["items"]) == 1
    assert respuesta.json()["items"][0]["quantity"] == 5
    db.refresh(producto)
    assert producto.stock == 5


def test_empleado_vende_y_anonimo_no(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """El empleado vende en mostrador; sin token, 401 en ambas rutas."""
    local = crear_local("Florería", "floreria")
    crear_usuario("empleada@floreria.co", local.id, UserRole.STAFF)
    cabeceras = autenticar("empleada@floreria.co")
    producto = crear_producto(local.id, "Rosa roja", precio=2500, stock=10)
    cuerpo = {"items": [{"product_id": producto.id, "quantity": 1}], "payment_method": "efectivo"}

    assert client.post("/api/v1/sales", json=cuerpo, headers=cabeceras).status_code == 201
    assert client.get("/api/v1/sales", headers=cabeceras).status_code == 200
    assert client.post("/api/v1/sales", json=cuerpo).status_code == 401
    assert client.get("/api/v1/sales").status_code == 401


def test_listar_con_filtro_de_fechas(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    db: Session,
    client: TestClient,
) -> None:
    """El filtro trae solo las ventas de esos días (Bogotá, ambos incluidos)."""
    local, cabeceras = _local_dueno(crear_local, crear_usuario, autenticar)
    otro, _ = _local_dueno(crear_local, crear_usuario, autenticar, slug="floreria-b")
    producto = crear_producto(local.id, "Rosa roja", precio=2500, stock=100)
    ajeno = crear_producto(otro.id, "Girasol", precio=1000, stock=100)

    vieja = client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": producto.id, "quantity": 1}], "payment_method": "efectivo"},
        headers=cabeceras,
    ).json()
    de_otro = client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": ajeno.id, "quantity": 1}], "payment_method": "efectivo"},
        headers=autenticar(f"duena@floreria-b.co"),
    ).json()
    db.execute(
        update(Sale).where(Sale.id == vieja["id"]).values(created_at=datetime(2020, 5, 10, 12, 0, tzinfo=BOGOTA))
    )
    db.execute(
        update(Sale).where(Sale.id == de_otro["id"]).values(created_at=datetime(2020, 5, 10, 12, 0, tzinfo=BOGOTA))
    )

    de_2020 = client.get(
        "/api/v1/sales", params={"desde": "2020-01-01", "hasta": "2020-12-31"}, headers=cabeceras
    ).json()
    assert [v["id"] for v in de_2020] == [vieja["id"]]  # la del otro local no sale

    hoy = datetime.now(BOGOTA).date().isoformat()
    de_hoy = client.get(
        "/api/v1/sales", params={"desde": hoy, "hasta": hoy}, headers=cabeceras
    ).json()
    assert de_hoy == []

    # Una venta de hoy para cerrar el filtro
    de_hoy_id = client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": producto.id, "quantity": 1}], "payment_method": "tarjeta"},
        headers=cabeceras,
    ).json()["id"]
    de_hoy = client.get(
        "/api/v1/sales", params={"desde": hoy, "hasta": hoy}, headers=cabeceras
    ).json()
    assert [v["id"] for v in de_hoy] == [de_hoy_id]
    todas = client.get("/api/v1/sales", headers=cabeceras).json()
    assert [v["id"] for v in todas] == [de_hoy_id, vieja["id"]]  # más reciente primero
