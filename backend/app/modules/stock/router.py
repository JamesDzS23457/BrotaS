"""Router HTTP del módulo stock (movimientos de stock)."""
from fastapi import APIRouter

router = APIRouter(prefix="/stock", tags=["stock"])
