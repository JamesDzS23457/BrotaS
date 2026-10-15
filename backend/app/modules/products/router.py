"""Router HTTP del módulo products (productos y categorías)."""
from fastapi import APIRouter

router = APIRouter(prefix="/products", tags=["products"])
