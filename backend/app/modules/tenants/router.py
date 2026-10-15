"""Router HTTP del módulo tenants (locales)."""
from fastapi import APIRouter

router = APIRouter(prefix="/tenants", tags=["tenants"])
