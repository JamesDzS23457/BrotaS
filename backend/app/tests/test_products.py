"""Pruebas del CRUD de categorías y productos (Prompt 1.1)."""
from collections.abc import Callable

from fastapi.testclient import TestClient

from app.modules.auth.models import User
from app.modules.products.models import Product
from app.modules.tenants.models import Tenant


def _local_con_dueno(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    autenticar: Callable[[str], dict[str, str]],
    nombre: str,
    slug: str,
) -> tuple[Tenant, dict[str, str]]:
    """Crea un local con su dueño y devuelve el local más sus cabeceras."""
    local = crear_local(nombre, slug)
    email = f"dueno@{slug}.co"
    crear_usuario(email, local.id)
    return local, autenticar(email)


# ------------------------------------------------------------------ categorías
def test_owner_crea_categoria(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """El dueño crea una categoría y queda marcada con su local."""
    local, cabeceras = _local_con_dueno(
        crear_local, crear_usuario, autenticar, "Florería", "floreria"
    )

    respuesta = client.post("/api/v1/categories", json={"name": "  Ramos  "}, headers=cabeceras)

    assert respuesta.status_code == 201, respuesta.text
    datos = respuesta.json()
    assert datos["name"] == "Ramos"  # los espacios sobrantes se quitan
    assert datos["tenant_id"] == local.id
    assert datos["is_active"] is True


def test_categoria_duplicada_en_el_mismo_local_da_409(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """El nombre repetido (sin importar mayúsculas) se rechaza con 409."""
    _, cabeceras = _local_con_dueno(
        crear_local, crear_usuario, autenticar, "Florería", "floreria"
    )
    assert (
        client.post("/api/v1/categories", json={"name": "Ramos"}, headers=cabeceras).status_code
        == 201
    )

    respuesta = client.post("/api/v1/categories", json={"name": "rAmOs"}, headers=cabeceras)

    assert respuesta.status_code == 409


def test_mismo_nombre_en_otro_local_si_vale(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """La unicidad del nombre es por local, no global."""
    _, cabeceras_a = _local_con_dueno(
        crear_local, crear_usuario, autenticar, "Florería A", "floreria-a"
    )
    _, cabeceras_b = _local_con_dueno(
        crear_local, crear_usuario, autenticar, "Florería B", "floreria-b"
    )
    assert (
        client.post("/api/v1/categories", json={"name": "Ramos"}, headers=cabeceras_a).status_code
        == 201
    )

    respuesta = client.post("/api/v1/categories", json={"name": "Ramos"}, headers=cabeceras_b)

    assert respuesta.status_code == 201, respuesta.text


def test_listar_categorias_con_busqueda(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """El listado filtra por nombre y ordena alfabéticamente."""
    _, cabeceras = _local_con_dueno(
        crear_local, crear_usuario, autenticar, "Florería", "floreria"
    )
    for nombre in ("Ramos", "Plantas", "Ramos de novia"):
        client.post("/api/v1/categories", json={"name": nombre}, headers=cabeceras)

    respuesta = client.get("/api/v1/categories", params={"search": "ramo"}, headers=cabeceras)

    assert respuesta.status_code == 200
    nombres = [c["name"] for c in respuesta.json()]
    assert nombres == ["Ramos", "Ramos de novia"]


def test_editar_y_reactivar_categoria(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """PATCH edita por partes: renombra, desactiva y reactiva."""
    _, cabeceras = _local_con_dueno(
        crear_local, crear_usuario, autenticar, "Florería", "floreria"
    )
    creada = client.post("/api/v1/categories", json={"name": "Ramos"}, headers=cabeceras).json()

    renombrada = client.patch(
        f"/api/v1/categories/{creada['id']}", json={"name": "Arreglos"}, headers=cabeceras
    )
    assert renombrada.status_code == 200
    assert renombrada.json()["name"] == "Arreglos"

    desactivada = client.patch(
        f"/api/v1/categories/{creada['id']}", json={"is_active": False}, headers=cabeceras
    )
    assert desactivada.json()["is_active"] is False

    reactivada = client.patch(
        f"/api/v1/categories/{creada['id']}", json={"is_active": True}, headers=cabeceras
    )
    assert reactivada.json()["is_active"] is True


def test_desactivar_categoria_es_borrado_logico(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """DELETE desactiva: la categoría sigue existiendo y sus productos la conservan."""
    local, cabeceras = _local_con_dueno(
        crear_local, crear_usuario, autenticar, "Florería", "floreria"
    )
    categoria = client.post(
        "/api/v1/categories", json={"name": "Ramos"}, headers=cabeceras
    ).json()
    producto = crear_producto(local.id, "Rosa roja", category_id=categoria["id"])

    respuesta = client.delete(f"/api/v1/categories/{categoria['id']}", headers=cabeceras)

    assert respuesta.status_code == 200
    assert respuesta.json()["is_active"] is False
    # El producto conserva la referencia a su categoría
    detalle = client.get(f"/api/v1/products/{producto.id}", headers=cabeceras).json()
    assert detalle["category_id"] == categoria["id"]
    # El listado normal la oculta, pero con el filtro aparece
    nombres = [c["name"] for c in client.get("/api/v1/categories", headers=cabeceras).json()]
    assert "Ramos" not in nombres
    nombres_todas = [
        c["name"]
        for c in client.get(
            "/api/v1/categories", params={"include_inactive": True}, headers=cabeceras
        ).json()
    ]
    assert "Ramos" in nombres_todas


def test_categoria_de_otro_local_da_404(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """Un local no puede ver ni tocar las categorías de otro."""
    _, cabeceras_a = _local_con_dueno(
        crear_local, crear_usuario, autenticar, "Florería A", "floreria-a"
    )
    _, cabeceras_b = _local_con_dueno(
        crear_local, crear_usuario, autenticar, "Florería B", "floreria-b"
    )
    categoria = client.post("/api/v1/categories", json={"name": "Ramos"}, headers=cabeceras_a).json()

    assert (
        client.get(f"/api/v1/categories/{categoria['id']}", headers=cabeceras_b).status_code == 404
    )
    assert (
        client.patch(
            f"/api/v1/categories/{categoria['id']}", json={"name": "Otro"}, headers=cabeceras_b
        ).status_code
        == 404
    )
    assert (
        client.delete(f"/api/v1/categories/{categoria['id']}", headers=cabeceras_b).status_code
        == 404
    )


def test_categoria_invalida_da_422(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """Nombre vacío (o solo espacios) y campos extra se rechazan."""
    _, cabeceras = _local_con_dueno(
        crear_local, crear_usuario, autenticar, "Florería", "floreria"
    )

    assert (
        client.post("/api/v1/categories", json={"name": "   "}, headers=cabeceras).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v1/categories", json={"name": "Ramos", "stock": 5}, headers=cabeceras
        ).status_code
        == 422
    )


# ------------------------------------------------------------------- productos
def test_owner_crea_producto_con_stock_cero(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """El producto nace con stock cero; el campo stock ni siquiera se acepta."""
    _, cabeceras = _local_con_dueno(
        crear_local, crear_usuario, autenticar, "Florería", "floreria"
    )

    respuesta = client.post(
        "/api/v1/products",
        json={"name": "Rosa roja", "price": "2500.00", "min_stock": 5},
        headers=cabeceras,
    )

    assert respuesta.status_code == 201, respuesta.text
    datos = respuesta.json()
    assert datos["stock"] == 0
    assert datos["price"] == "2500.00"
    assert datos["min_stock"] == 5
    assert datos["is_active"] is True

    con_stock = client.post(
        "/api/v1/products",
        json={"name": "Tulipán", "price": "3000.00", "stock": 10},
        headers=cabeceras,
    )
    assert con_stock.status_code == 422


def test_producto_con_categoria_ajena_da_400(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """No se puede asignar una categoría de otro local (ni una que no existe)."""
    _, cabeceras_a = _local_con_dueno(
        crear_local, crear_usuario, autenticar, "Florería A", "floreria-a"
    )
    _, cabeceras_b = _local_con_dueno(
        crear_local, crear_usuario, autenticar, "Florería B", "floreria-b"
    )
    categoria = client.post("/api/v1/categories", json={"name": "Ramos"}, headers=cabeceras_a).json()

    ajena = client.post(
        "/api/v1/products",
        json={"name": "Rosa", "price": "1000.00", "category_id": categoria["id"]},
        headers=cabeceras_b,
    )
    assert ajena.status_code == 400

    fantasma = client.post(
        "/api/v1/products",
        json={"name": "Rosa", "price": "1000.00", "category_id": 999999},
        headers=cabeceras_b,
    )
    assert fantasma.status_code == 400


def test_precio_invalido_da_422(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """Precio negativo o con más de dos decimales se rechaza."""
    _, cabeceras = _local_con_dueno(
        crear_local, crear_usuario, autenticar, "Florería", "floreria"
    )

    assert (
        client.post(
            "/api/v1/products", json={"name": "Rosa", "price": "-5.00"}, headers=cabeceras
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v1/products", json={"name": "Rosa", "price": "10.999"}, headers=cabeceras
        ).status_code
        == 422
    )


def test_listar_con_busqueda_filtro_y_paginacion(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """Búsqueda por nombre, filtro por categoría y paginación combinados."""
    local, cabeceras = _local_con_dueno(
        crear_local, crear_usuario, autenticar, "Florería", "floreria"
    )
    ramos = client.post("/api/v1/categories", json={"name": "Ramos"}, headers=cabeceras).json()
    plantas = client.post("/api/v1/categories", json={"name": "Plantas"}, headers=cabeceras).json()
    crear_producto(local.id, "Rosa roja", category_id=ramos["id"])
    crear_producto(local.id, "Rosa blanca", category_id=ramos["id"])
    crear_producto(local.id, "Rosa miniatura", category_id=plantas["id"])

    por_nombre = client.get("/api/v1/products", params={"search": "rosa"}, headers=cabeceras).json()
    assert por_nombre["total"] == 3

    por_categoria = client.get(
        "/api/v1/products", params={"category_id": plantas["id"]}, headers=cabeceras
    ).json()
    assert por_categoria["total"] == 1
    assert por_categoria["items"][0]["name"] == "Rosa miniatura"

    pagina_1 = client.get(
        "/api/v1/products", params={"page": 1, "page_size": 2}, headers=cabeceras
    ).json()
    assert pagina_1["total"] == 3
    assert pagina_1["pages"] == 2
    assert len(pagina_1["items"]) == 2

    pagina_2 = client.get(
        "/api/v1/products", params={"page": 2, "page_size": 2}, headers=cabeceras
    ).json()
    assert len(pagina_2["items"]) == 1


def test_editar_producto_parcial(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """PATCH cambia solo lo enviado y deja el resto igual."""
    local, cabeceras = _local_con_dueno(
        crear_local, crear_usuario, autenticar, "Florería", "floreria"
    )
    producto = crear_producto(local.id, "Rosa roja", precio=2500)

    respuesta = client.patch(
        f"/api/v1/products/{producto.id}", json={"price": "3200.50"}, headers=cabeceras
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["price"] == "3200.50"
    assert respuesta.json()["name"] == "Rosa roja"


def test_desactivar_producto_es_borrado_logico(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """DELETE desactiva: el producto sigue consultable y se puede reactivar."""
    local, cabeceras = _local_con_dueno(
        crear_local, crear_usuario, autenticar, "Florería", "floreria"
    )
    producto = crear_producto(local.id, "Rosa roja")

    respuesta = client.delete(f"/api/v1/products/{producto.id}", headers=cabeceras)

    assert respuesta.status_code == 200
    assert respuesta.json()["is_active"] is False
    # Sigue consultable por id
    assert client.get(f"/api/v1/products/{producto.id}", headers=cabeceras).status_code == 200
    # El listado normal lo oculta; con el filtro aparece
    assert client.get("/api/v1/products", headers=cabeceras).json()["total"] == 0
    assert (
        client.get("/api/v1/products", params={"include_inactive": True}, headers=cabeceras).json()[
            "total"
        ]
        == 1
    )
    # Y se puede reactivar
    reactivado = client.patch(
        f"/api/v1/products/{producto.id}", json={"is_active": True}, headers=cabeceras
    )
    assert reactivado.json()["is_active"] is True


def test_producto_de_otro_local_da_404(
    crear_local: Callable[..., Tenant],
    crear_usuario: Callable[..., User],
    crear_producto: Callable[..., Product],
    autenticar: Callable[[str], dict[str, str]],
    client: TestClient,
) -> None:
    """Un local no puede ver ni tocar los productos de otro."""
    local_a, _ = _local_con_dueno(
        crear_local, crear_usuario, autenticar, "Florería A", "floreria-a"
    )
    _, cabeceras_b = _local_con_dueno(
        crear_local, crear_usuario, autenticar, "Florería B", "floreria-b"
    )
    producto = crear_producto(local_a.id, "Rosa roja")

    assert client.get(f"/api/v1/products/{producto.id}", headers=cabeceras_b).status_code == 404
    assert (
        client.patch(
            f"/api/v1/products/{producto.id}", json={"price": "1.00"}, headers=cabeceras_b
        ).status_code
        == 404
    )
    assert client.delete(f"/api/v1/products/{producto.id}", headers=cabeceras_b).status_code == 404
