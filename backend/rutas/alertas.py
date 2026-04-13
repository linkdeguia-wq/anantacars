"""
rutas/alertas.py — Alertas WhatsApp para interesados.
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import httpx
import os
from config import SUPABASE_URL, HEADERS_SERVICE
from rutas.auth import verificar_token

router = APIRouter()

TWILIO_SID     = os.getenv("TWILIO_SID", "")
TWILIO_TOKEN   = os.getenv("TWILIO_TOKEN", "")
TWILIO_WA_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")


class AlertaNueva(BaseModel):
    telefono: str
    marca: Optional[str] = None
    precio_max: Optional[float] = None
    combustible: Optional[str] = None
    km_max: Optional[int] = None


def requiere_admin(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")
    return verificar_token(authorization.split(" ")[1])


async def enviar_whatsapp(telefono: str, mensaje: str) -> bool:
    if not TWILIO_SID or not TWILIO_TOKEN:
        print(f"[ALERTA SIMULADA] → {telefono}: {mensaje}")
        return False
    url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            auth=(TWILIO_SID, TWILIO_TOKEN),
            data={"From": TWILIO_WA_FROM, "To": f"whatsapp:+{telefono}", "Body": mensaje}
        )
    return resp.status_code in (200, 201)


@router.post("/suscribir")
async def suscribir_alerta(alerta: AlertaNueva):
    payload = {
        "telefono": alerta.telefono,
        "marca": alerta.marca,
        "precio_max": alerta.precio_max,
        "combustible": alerta.combustible,
        "km_max": alerta.km_max,
        "activa": True,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/alertas_usuarios",
            headers={**HEADERS_SERVICE, "Prefer": "return=minimal"},
            json=payload,
        )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail="Error al guardar alerta")

    await enviar_whatsapp(alerta.telefono, "✅ Alerta activada. Te avisaremos cuando entre un coche que encaje.")
    return {"ok": True}


@router.post("/notificar/{coche_id}")
async def notificar_nuevo_coche(coche_id: int, authorization: str = Header(...)):
    requiere_admin(authorization)

    async with httpx.AsyncClient() as client:
        resp_coche = await client.get(
            f"{SUPABASE_URL}/rest/v1/coches",
            headers=HEADERS_SERVICE,
            params={"select": "*", "id": f"eq.{coche_id}"},
        )
    coches = resp_coche.json()
    if not coches:
        raise HTTPException(status_code=404, detail="Coche no encontrado")
    coche = coches[0]

    async with httpx.AsyncClient() as client:
        resp_alertas = await client.get(
            f"{SUPABASE_URL}/rest/v1/alertas_usuarios",
            headers=HEADERS_SERVICE,
            params={"select": "*", "activa": "eq.true"},
        )
    alertas = resp_alertas.json()

    notificados = 0
    for alerta in alertas:
        coincide = True
        if alerta.get("marca") and alerta["marca"].lower() not in coche["marca"].lower():
            coincide = False
        if alerta.get("precio_max") and coche["precio"] > alerta["precio_max"]:
            coincide = False
        if alerta.get("combustible") and alerta["combustible"] != coche["combustible"]:
            coincide = False
        if alerta.get("km_max") and coche["km"] > alerta["km_max"]:
            coincide = False

        if coincide:
            precio  = f"{coche['precio']:,.0f}€".replace(",", ".")
            mensaje = (
                f"🚗 ¡Nuevo coche!\n\n"
                f"{coche['marca']} {coche['modelo']} {coche['anio']}\n"
                f"💶 {precio} · {coche['km']:,} km\n\n"
                f"Escríbenos para más info 👇"
            )
            if await enviar_whatsapp(alerta["telefono"], mensaje):
                notificados += 1

    return {"ok": True, "notificados": notificados}


@router.delete("/cancelar/{telefono}")
async def cancelar_alertas(telefono: str):
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"{SUPABASE_URL}/rest/v1/alertas_usuarios",
            headers=HEADERS_SERVICE,
            params={"telefono": f"eq.{telefono}"},
            json={"activa": False},
        )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Error al cancelar")
    await enviar_whatsapp(telefono, "✅ Tus alertas han sido canceladas.")
    return {"ok": True}