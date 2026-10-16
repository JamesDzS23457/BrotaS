"""apps y planes por local

- `tenants` gana `timezone` y `currency` (con valor para los que ya existen).
- Tablas nuevas `apps` y `tenant_apps`: se crea la app florist y se asigna a los
  locales que ya existen con el plan inventario.

Revision ID: c0b6f981b6b2
Revises: ff2050927a32
Create Date: 2026-10-15 23:16:25.129305

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# identificadores de la revisión usados por Alembic
revision: str = 'c0b6f981b6b2'
down_revision: Union[str, None] = 'ff2050927a32'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('apps',
    sa.Column('code', sa.String(length=20), nullable=False),
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.PrimaryKeyConstraint('code')
    )
    op.create_table('tenant_apps',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('tenant_id', sa.Integer(), nullable=False),
    sa.Column('app_code', sa.String(length=20), nullable=False),
    sa.Column('plan', sa.String(length=20), nullable=False, server_default='inventario'),
    sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
    sa.ForeignKeyConstraint(['app_code'], ['apps.code'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('tenant_id', 'app_code', name='uq_tenant_apps_tenant_app')
    )
    op.create_index(op.f('ix_tenant_apps_app_code'), 'tenant_apps', ['app_code'], unique=False)
    op.create_index(op.f('ix_tenant_apps_tenant_id'), 'tenant_apps', ['tenant_id'], unique=False)
    # server_default para que los locales que ya existen queden en Bogotá/COP
    op.add_column('tenants', sa.Column('timezone', sa.String(length=60), server_default='America/Bogota', nullable=False))
    op.add_column('tenants', sa.Column('currency', sa.String(length=3), server_default='COP', nullable=False))

    # Datos iniciales: la app florist para los locales que ya existen
    op.execute("INSERT INTO apps (code, name) VALUES ('florist', 'Florerías')")
    op.execute("INSERT INTO tenant_apps (tenant_id, app_code) SELECT id, 'florist' FROM tenants")


def downgrade() -> None:
    op.execute("DELETE FROM tenant_apps WHERE app_code = 'florist'")
    op.execute("DELETE FROM apps WHERE code = 'florist'")
    op.drop_column('tenants', 'currency')
    op.drop_column('tenants', 'timezone')
    op.drop_index(op.f('ix_tenant_apps_tenant_id'), table_name='tenant_apps')
    op.drop_index(op.f('ix_tenant_apps_app_code'), table_name='tenant_apps')
    op.drop_table('tenant_apps')
    op.drop_table('apps')
