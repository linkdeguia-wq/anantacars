"""
rutas/redes.py — Publicación automática en redes sociales.
Pendiente de implementar cuando se configure Meta Business API.
"""

from fastapi import APIRouter, HTTPException, Header
import os
from rutas.auth import verificar_token

router = APIRouter()

META_ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "")
META_PAGE_ID      = os.getenv("META_PAGE_ID", "")
META_IG_USER_ID   = os.getenv("META_IG_USER_ID", "")


def requiere_admin(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")
    return verificar_token(authorization.split(" ")[1])


@router.post("/publicar/{coche_id}")
async def publicar_coche(coche_id: int, authorization: str = Header(...)):
    requiere_admin(authorization)
    return {
        "ok": False,
        "mensaje": "Pendiente de implementar. Configura META_ACCESS_TOKEN en .env",
        "coche_id": coche_id,
    }


@router.get("/estado")
async def estado_redes(authorization: str = Header(...)):
    requiere_admin(authorization)
    return {
        "instagram": bool(META_ACCESS_TOKEN and META_IG_USER_ID),
        "facebook":  bool(META_ACCESS_TOKEN and META_PAGE_ID),
        "tiktok":    False,
    }