"""Router HTTP del módulo auth (usuarios y login)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token
from app.modules.auth.models import User
from app.modules.auth.schemas import LoginRequest, TokenResponse, UserProfile
from app.modules.auth.service import authenticate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Inicia sesión y devuelve un JWT."""
    user = authenticate(db, data.email, data.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
        )
    token = create_access_token(user.id, user.tenant_id, user.role.value)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserProfile)
def read_profile(current_user: User = Depends(get_current_user)) -> User:
    """Devuelve los datos del usuario autenticado (para mostrar su correo)."""
    return current_user
