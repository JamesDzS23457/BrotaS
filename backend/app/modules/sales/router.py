"""Router HTTP del módulo sales (ventas y sus items)."""
from fastapi import APIRouter

router = APIRouter(prefix="/sales", tags=["sales"])
