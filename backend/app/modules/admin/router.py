"""Router HTTP del módulo admin (superadmin)."""
from fastapi import APIRouter

router = APIRouter(prefix="/admin", tags=["admin"])
