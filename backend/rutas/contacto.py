"""
rutas/contacto.py — Formulario de contacto.
Recibe consultas del cliente y las reenvía a Web3Forms con la key oculta en backend.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address
import httpx
import os

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

W3F_KEY = os.getenv("W3F_KEY", "")  # ← variable de entorno en Railway


class ConsultaContacto(BaseModel):
    nombre:        str = Field(min_length=2,  max_length=80)
    email:         EmailStr
    mensaje:       str = Field(min_length=5,  max_length=2000)
    vehiculo:      Optional[str] = Field(None, max_length=200)
    vehiculo_url:  Optional[str] = Field(None, max_length=500)
    # Honeypot — los bots rellenan campos ocultos. Si llega → es bot.
    website: Optional[str] = Field(None, max_length=200)


@router.post("/enviar")
@limiter.limit("5/minute")
async def enviar_consulta(datos: ConsultaContacto, request: Request):
    """
    Recibe consulta del frontend, la reenvía a Web3Forms con key oculta en servidor.
    - 5 envíos por minuto por IP
    - Honeypot anti-bot
    - Validación email + tamaños
    """
    # Honeypot — si el bot rellenó el campo, fingimos éxito y descartamos
    if datos.website:
        return {"ok": True}

    if not W3F_KEY:
        raise HTTPException(status_code=500, detail="Servicio de email no configurado")

    payload = {
        "access_key": W3F_KEY,
        "subject": f"Consulta sobre {datos.vehiculo or 'la web'} — Ananta Cars",
        "name": datos.nombre,
        "email": datos.email,
        "message": datos.mensaje,
        "vehicle": datos.vehiculo or "",
        "vehicle_url": datos.vehiculo_url or "",
        "from_name": "Ananta Cars Web",
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.web3forms.com/submit",
                headers={"Content-Type": "application/json"},
                json=payload,
            )
        data = resp.json()
        if not data.get("success"):
            raise HTTPException(status_code=502, detail="Error al enviar consulta")
        return {"ok": True}
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Error de red al enviar consulta")
