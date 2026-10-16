"""Configuración de las pruebas: base de datos de prueba y cliente HTTP.

Cada prueba corre dentro de una transacción que se revierte al final, así que la
base de datos de prueba queda limpia siempre.
"""
import os
import sys
from collections.abc import Callable, Generator
from pathlib import Path

# Asegura que el paquete 'app' sea importable al correr pytest desde backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402
from sqlalchemy.orm import Session, sessionmaker  # noqa: E402

from app.core.database import Base, get_db  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.main import app  # noqa: E402  (importa todos los modelos)
from app.modules.auth.models import User, UserRole  # noqa: E402
from app.modules.products.models import Product  # noqa: E402
from app.modules.tenants.models import Tenant, TenantStatus  # noqa: E402

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://brotas:brotas@localhost:5432/brotas_test",
)

_url = make_url(TEST_DATABASE_URL)
engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def _crear_base_si_falta() -> None:
    """Crea la base de datos de prueba si todavía no existe."""
    admin = create_engine(_url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        existe = conn.execute(
            text("select 1 from pg_database where datname = :nombre"),
            {"nombre": _url.database},
        ).scalar()
        if not existe:
            conn.execute(text(f'create database "{_url.database}"'))
    admin.dispose()


def _limpiar_esquema() -> None:
    """Borra las tablas y los tipos enum del esquema de prueba."""
    Base.metadata.drop_all(bind=engine)
    with engine.begin() as conn:
        conn.execute(text("drop type if exists tenant_status cascade"))
        conn.execute(text("drop type if exists user_role cascade"))


@pytest.fixture(scope="session", autouse=True)
def _preparar_base() -> Generator[None, None, None]:
    """Prepara (una sola vez) el esquema de la base de datos de prueba."""
    _crear_base_si_falta()
    _limpiar_esquema()
    Base.metadata.create_all(bind=engine)
    yield
    _limpiar_esquema()
    engine.dispose()


@pytest.fixture
def db() -> Generator[Session, None, None]:
    """Sesión de prueba; todo lo que se haga se revierte al terminar."""
    connection = engine.connect()
    transaccion = connection.begin()
    session = Session(
        bind=connection,
        autoflush=False,
        expire_on_commit=False,
        join_transaction_mode="create_savepoint",
    )
    try:
        yield session
    finally:
        session.close()
        transaccion.rollback()
        connection.close()


@pytest.fixture
def client(db: Session) -> Generator[TestClient, None, None]:
    """Cliente HTTP que usa la sesión de prueba en los endpoints."""

    def _override_db() -> Generator[Session, None, None]:
        yield db

    app.dependency_overrides[get_db] = _override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# --------------------------------------------------------------- datos de prueba
# Clave que usan todos los usuarios de prueba.
PASSWORD = "clave1234"


@pytest.fixture
def crear_local(db: Session) -> Callable[..., Tenant]:
    """Crea un local (tenant) y lo deja disponible en la sesión de prueba."""

    def _crear(
        nombre: str, slug: str, status: TenantStatus = TenantStatus.ACTIVE
    ) -> Tenant:
        tenant = Tenant(name=nombre, slug=slug, status=status)
        db.add(tenant)
        db.flush()
        return tenant

    return _crear


@pytest.fixture
def crear_usuario(db: Session) -> Callable[..., User]:
    """Crea un usuario. Sin local (tenant_id nulo) es superadmin; con local es owner
    salvo que se pida otro rol."""

    def _crear(
        email: str, tenant_id: int | None, role: UserRole | None = None
    ) -> User:
        user = User(
            tenant_id=tenant_id,
            email=email,
            password_hash=hash_password(PASSWORD),
            role=role or (UserRole.OWNER if tenant_id else UserRole.SUPERADMIN),
        )
        db.add(user)
        db.flush()
        return user

    return _crear


@pytest.fixture
def crear_producto(db: Session) -> Callable[..., Product]:
    """Crea un producto directamente en la base de prueba."""

    def _crear(
        tenant_id: int,
        nombre: str = "Rosa roja",
        *,
        precio: int = 1000,
        category_id: int | None = None,
        stock: int = 0,
        min_stock: int = 0,
        is_active: bool = True,
    ) -> Product:
        product = Product(
            tenant_id=tenant_id,
            name=nombre,
            price=precio,
            stock=stock,
            category_id=category_id,
            is_active=is_active,
            is_published=False,
            min_stock=min_stock,
        )
        db.add(product)
        db.flush()
        return product

    return _crear


@pytest.fixture
def autenticar(client: TestClient) -> Callable[[str], dict[str, str]]:
    """Inicia sesión y devuelve la cabecera Authorization lista para usar."""

    def _autenticar(email: str) -> dict[str, str]:
        respuesta = client.post(
            "/api/v1/auth/login", json={"email": email, "password": PASSWORD}
        )
        assert respuesta.status_code == 200, respuesta.text
        return {"Authorization": f"Bearer {respuesta.json()['access_token']}"}

    return _autenticar
