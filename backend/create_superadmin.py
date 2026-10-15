"""Crea el usuario superadmin desde la terminal.

Uso (desde backend/):  python create_superadmin.py
"""
import getpass
import sys

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.modules.auth.models import User, UserRole
from app.modules.tenants import models as tenants_models  # noqa: F401  (registra tenants para la FK)


def main() -> None:
    """Pide correo y contraseña y crea el superadmin."""
    email = input("Correo del superadmin: ").strip()
    password = getpass.getpass("Contraseña: ")

    if not email or not password:
        print("El correo y la contraseña son obligatorios.")
        sys.exit(1)

    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == email)) is not None:
            print(f"Ya existe un usuario con el correo {email}.")
            sys.exit(1)

        user = User(
            tenant_id=None,  # el superadmin no pertenece a ningún local
            email=email,
            password_hash=hash_password(password),
            role=UserRole.SUPERADMIN,
        )
        db.add(user)
        db.commit()
        print(f"Superadmin {email} creado.")


if __name__ == "__main__":
    main()
