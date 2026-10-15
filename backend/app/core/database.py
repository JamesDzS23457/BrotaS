"""Conexión a la base de datos con SQLAlchemy 2.0."""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

# Engine de SQLAlchemy 2.0 (pool_pre_ping evita conexiones caídas)
engine = create_engine(settings.database_url, pool_pre_ping=True)

# Fábrica de sesiones
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Clase base de la que heredan todos los modelos."""


def get_db() -> Generator[Session, None, None]:
    """Dependencia que entrega una sesión y la cierra al terminar."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
