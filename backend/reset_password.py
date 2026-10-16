"""Cambia la contraseña de un usuario existente desde la terminal.

Uso (desde backend/):  .venv/bin/python reset_password.py

La contraseña se pide oculta y nunca se muestra ni se guarda en texto plano.
"""
import getpass
import sys

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.modules.auth.models import User
from app.modules.tenants import models as tenants_models  # noqa: F401  (registra tenants para la FK)


def main() -> None:
    """Pide el correo y la contraseña nueva y actualiza el hash."""
    email = input("Correo del usuario: ").strip()
    if not email:
        print("El correo es obligatorio.")
        sys.exit(1)

    nueva = getpass.getpass("Nueva contraseña: ")
    if not nueva:
        print("La contraseña es obligatoria.")
        sys.exit(1)

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            print(f"No existe ningún usuario con el correo {email}.")
            sys.exit(1)
        user.password_hash = hash_password(nueva)
        db.commit()
        print(f"Contraseña actualizada para {email}.")


if __name__ == "__main__":
    main()
