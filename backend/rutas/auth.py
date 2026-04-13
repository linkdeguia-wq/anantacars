"""
rutas/auth.py — Login del panel de administración.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from jose import jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
import os
from config import SECRET_KEY, ALGORITHM, TOKEN_EXPIRE_HORAS

router = APIRouter()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


class LoginDatos(BaseModel):
    usuario: str
    password: str

class TokenRespuesta(BaseModel):
    token: str
    tipo: str = "bearer"


def crear_token(datos: dict) -> str:
    payload = datos.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HORAS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verificar_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado"
        )


ADMIN_USUARIO      = os.getenv("ADMIN_USUARIO", "admin")
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH", "")


@router.post("/login", response_model=TokenRespuesta)
def login(datos: LoginDatos):
    if datos.usuario != ADMIN_USUARIO:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    password_ok = False
    admin_pass_raw = os.getenv("ADMIN_PASSWORD", "")

    if ADMIN_PASSWORD_HASH:
        password_ok = pwd_ctx.verify(datos.password, ADMIN_PASSWORD_HASH)
    elif admin_pass_raw:
        password_ok = datos.password == admin_pass_raw

    if not password_ok:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    token = crear_token({"sub": ADMIN_USUARIO, "rol": "admin"})
    return TokenRespuesta(token=token)


@router.get("/verificar")
def verificar(token: str):
    payload = verificar_token(token)
    return {"valido": True, "usuario": payload.get("sub")}