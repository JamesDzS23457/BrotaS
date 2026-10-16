"""borrado logico en categorias

Agrega is_active a categories para poder desactivar una categoría sin borrarla:
los productos que la usan conservan la referencia (la FK es ON DELETE SET NULL).

Revision ID: ff2050927a32
Revises: 9767dc65d0eb
Create Date: 2026-10-15 20:55:04.403439

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# identificadores de la revisión usados por Alembic
revision: str = 'ff2050927a32'
down_revision: Union[str, None] = '9767dc65d0eb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # server_default para que las categorías que ya existen queden activas
    op.add_column(
        "categories",
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("categories", "is_active")
