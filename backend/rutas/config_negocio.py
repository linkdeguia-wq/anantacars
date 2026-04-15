"""
rutas/config_negocio.py — Configuración del negocio.
Tabla configuracion_negocio con una sola fila (id=1).
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import httpx
from config import SUPABASE_URL, HEADERS_SERVICE
from rutas.auth import verificar_token

router = APIRouter()
TABLA = f"{SUPABASE_URL}/rest/v1/configuracion_negocio"


class ConfigUpdate(BaseModel):
    nombre_negocio: Optional[str] = None
    whatsapp: Optional[str] = None
    dominio: Optional[str] = None
    modulo_calculadora: Optional[bool] = None
    modulo_comparador: Optional[bool] = None
    modulo_alertas: Optional[bool] = None
    modulo_chat: Optional[bool] = None
    modulo_resenas: Optional[bool] = None
    calc_tin: Optional[float] = None
    calc_plazo_max: Optional[int] = None
    calc_entrada_min: Optional[int] = None
    garantia_activa: Optional[bool] = None
    garantia_texto: Optional[str] = None
    chat_codigo: Optional[str] = None
    analytics_id: Optional[str] = None
    telefono: Optional[str] = None
    resenas_place_id: Optional[str] = None


def requiere_admin(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")
    return verificar_token(authorization.split(" ")[1])


@router.get("")
async def obtener_config():
    """Obtiene la configuración pública del negocio. Sin auth."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(TABLA, headers=HEADERS_SERVICE, params={"select": "*", "id": "eq.1"})
    data = resp.json()
    if not data:
        return {}
    cfg = data[0]
    # Ocultar campos sensibles en endpoint público
    cfg.pop("chat_codigo", None)
    return cfg


@router.get("/admin")
async def obtener_config_admin(authorization: str = Header(...)):
    """Obtiene configuración completa incluyendo campos sensibles. Requiere auth."""
    requiere_admin(authorization)
    async with httpx.AsyncClient() as client:
        resp = await client.get(TABLA, headers=HEADERS_SERVICE, params={"select": "*", "id": "eq.1"})
    data = resp.json()
    return data[0] if data else {}


@router.patch("")
async def actualizar_config(cambios: ConfigUpdate, authorization: str = Header(...)):
    """Actualiza la configuración del negocio."""
    requiere_admin(authorization)
    payload = {k: v for k, v in cambios.dict().items() if v is not None}
    if not payload:
        raise HTTPException(status_code=400, detail="No se enviaron cambios")
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            TABLA, headers=HEADERS_SERVICE,
            params={"id": "eq.1"},
            json=payload,
        )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Error al guardar configuración")
    return {"ok": True}
