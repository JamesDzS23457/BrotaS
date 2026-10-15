"""Router HTTP del módulo catalog (catálogo público, sin login)."""
from fastapi import APIRouter

router = APIRouter(prefix="/catalog", tags=["catalog"])
