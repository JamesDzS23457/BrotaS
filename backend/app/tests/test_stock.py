"""Pruebas del control de stock (Prompt 1.3)."""
from collections.abc import Callable

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.auth.models import User, UserRole
from app.modules.products.models import Product
from app.modules.stock.models import StockMovement
from app.modules.tenants.models import Tenant


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


def _movimientos(db: Session, producto_id: int) -> list[StockMovement]:
    """Movimientos registrados para un producto, en orden."""
    return list(
        db.scalars(
            select(StockMovement)
            .where(StockMovement.product_id == producto_id)
            .order_by(StockMovement.id)
        )
    )


def test_sumar_stock_con_compra(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    db: Session,
    client: TestClient,
) -> None:
    """Una compra suma stock y queda registrada con el usuario que la hizo."""
    local, cabeceras = _local_dueno(crear_local, crear_usuario, autenticar)
    producto = crear_producto(local.id, "Rosa roja", stock=5)

    respuesta = client.post(
        f"/api/v1/florist/products/{producto.id}/stock",
        json={"change": 3, "reason": "compra"},
        headers=cabeceras,
    )

    assert respuesta.status_code == 200, respuesta.text
    datos = respuesta.json()
    assert datos["quantity_change"] == 3
    assert datos["reason"] == "compra"
    assert datos["stock_after"] == 8
    movimientos = _movimientos(db, producto.id)
    assert len(movimientos) == 1
    assert movimientos[0].tenant_id == local.id
    assert movimientos[0].quantity_change == 3
    assert movimientos[0].user_id is not None


def test_restar_stock_con_perdida_y_ajuste(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    db: Session,
    client: TestClient,
) -> None:
    """Las salidas restan y cada motivo queda en su movimiento."""
    local, cabeceras = _local_dueno(crear_local, crear_usuario, autenticar)
    producto = crear_producto(local.id, "Rosa roja", stock=10)

    perdida = client.post(
        f"/api/v1/florist/products/{producto.id}/stock",
        json={"change": -2, "reason": "pérdida"},
        headers=cabeceras,
    )
    ajuste = client.post(
        f"/api/v1/florist/products/{producto.id}/stock",
        json={"change": -8, "reason": "ajuste"},
        headers=cabeceras,
    )

    assert perdida.json()["stock_after"] == 8
    assert ajuste.json()["stock_after"] == 0  # llegar a cero exacto sí vale
    assert [m.quantity_change for m in _movimientos(db, producto.id)] == [-2, -8]


def test_no_permite_stock_negativo(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    db: Session,
    client: TestClient,
) -> None:
    """Si la resta pasa del stock, se rechaza y no se registra nada."""
    local, cabeceras = _local_dueno(crear_local, crear_usuario, autenticar)
    producto = crear_producto(local.id, "Rosa roja", stock=3)

    respuesta = client.post(
        f"/api/v1/florist/products/{producto.id}/stock",
        json={"change": -4, "reason": "pérdida"},
        headers=cabeceras,
    )

    assert respuesta.status_code == 400
    assert "negativo" in respuesta.json()["detail"].lower()
    db.refresh(producto)
    assert producto.stock == 3
    assert _movimientos(db, producto.id) == []


def test_cantidad_cero_y_motivo_invalido(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """Cero se rechaza con 400 y un motivo fuera de la lista con 422."""
    local, cabeceras = _local_dueno(crear_local, crear_usuario, autenticar)
    producto = crear_producto(local.id, "Rosa roja", stock=5)

    assert (
        client.post(
            f"/api/v1/florist/products/{producto.id}/stock",
            json={"change": 0, "reason": "ajuste"},
            headers=cabeceras,
        ).status_code
        == 400
    )
    assert (
        client.post(
            f"/api/v1/florist/products/{producto.id}/stock",
            json={"change": 1, "reason": "robo"},
            headers=cabeceras,
        ).status_code
        == 422
    )


def test_stock_de_otro_local_da_404(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """Un local no mueve el stock de productos ajenos (ni de ids fantasmas)."""
    local_a = crear_local("Florería A", "floreria-a")
    _, cabeceras_b = _local_dueno(crear_local, crear_usuario, autenticar, slug="floreria-b")
    producto = crear_producto(local_a.id, "Rosa roja", stock=5)
    cuerpo = {"change": 1, "reason": "compra"}

    assert (
        client.post(
            f"/api/v1/florist/products/{producto.id}/stock", json=cuerpo, headers=cabeceras_b
        ).status_code
        == 404
    )
    assert (
        client.post("/api/v1/florist/products/999999/stock", json=cuerpo, headers=cabeceras_b).status_code
        == 404
    )


def test_staff_no_mueve_stock_pero_si_lee(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """El rol staff no mueve stock (403) pero sí consulta el stock bajo."""
    local = crear_local("Florería", "floreria")
    crear_usuario("empleada@floreria.co", local.id, UserRole.STAFF)
    cabeceras = autenticar("empleada@floreria.co")
    producto = crear_producto(local.id, "Rosa roja", stock=5)

    assert (
        client.post(
            f"/api/v1/florist/products/{producto.id}/stock",
            json={"change": 1, "reason": "compra"},
            headers=cabeceras,
        ).status_code
        == 403
    )
    assert client.get("/api/v1/florist/products/low-stock", headers=cabeceras).status_code == 200


def test_mover_sin_token_da_401(
    crear_local: Callable[..., Tenant],
    crear_producto: Callable[..., Product],
    client: TestClient,
) -> None:
    """Sin token no se mueve stock ni se consulta el stock bajo."""
    local = crear_local("Florería", "floreria")
    producto = crear_producto(local.id, "Rosa roja", stock=5)

    assert (
        client.post(
            f"/api/v1/florist/products/{producto.id}/stock",
            json={"change": 1, "reason": "compra"},
        ).status_code
        == 401
    )
    assert client.get("/api/v1/florist/products/low-stock").status_code == 401


def test_low_stock_lista_solo_lo_que_esta_bajo_minimo(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """Aparecen los de stock <= mínimo (activos y del local), del más bajo primero."""
    local, cabeceras = _local_dueno(crear_local, crear_usuario, autenticar)
    otro, _ = _local_dueno(crear_local, crear_usuario, autenticar, slug="floreria-b")
    crear_producto(local.id, "Rosa justa", stock=5, min_stock=5)  # en el límite: entra
    crear_producto(local.id, "Rosa baja", stock=2, min_stock=5)  # entra primero
    crear_producto(local.id, "Rosa bien", stock=6, min_stock=5)  # no entra
    crear_producto(local.id, "Rosa vieja", stock=0, min_stock=5, is_active=False)  # inactiva: no entra
    crear_producto(otro.id, "Rosa ajena", stock=0, min_stock=5)  # otro local: no entra

    respuesta = client.get("/api/v1/florist/products/low-stock", headers=cabeceras)

    assert respuesta.status_code == 200
    assert [p["name"] for p in respuesta.json()] == ["Rosa baja", "Rosa justa"]


def test_cada_movimiento_suma_y_el_historial_cuadra(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    db: Session,
    client: TestClient,
) -> None:
    """Varios movimientos seguidos: el stock final es la suma del historial."""
    local, cabeceras = _local_dueno(crear_local, crear_usuario, autenticar)
    producto = crear_producto(local.id, "Rosa roja", stock=0)

    for change, reason in ((10, "compra"), (-3, "pérdida"), (1, "ajuste")):
        r = client.post(
            f"/api/v1/florist/products/{producto.id}/stock",
            json={"change": change, "reason": reason},
            headers=cabeceras,
        )
        assert r.status_code == 200, r.text

    total = db.scalar(
        select(func.sum(StockMovement.quantity_change)).where(
            StockMovement.product_id == producto.id
        )
    )
    db.refresh(producto)
    assert producto.stock == 8
    assert total == 8
