"""Router HTTP del módulo auth (usuarios y login)."""
from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])
