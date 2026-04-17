"""
rutas/fotos.py — Subida de fotos con logo como marca de agua.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Header, Query
from typing import List
import httpx
import io
import os
from PIL import Image, ImageDraw, ImageFont
from config import (
    SUPABASE_URL, HEADERS_SERVICE,
    MAX_FOTO_MB, CALIDAD_COMPRESION, ANCHO_MAX_FOTO,
    BUCKET_FOTOS, NOMBRE_NEGOCIO,
)
from rutas.auth import verificar_token
import time

router = APIRouter()

URL_STORAGE         = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_FOTOS}"
URL_STORAGE_PUBLICO = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_FOTOS}"

# Ruta al logo para marca de agua (se copia junto al código en Railway)
LOGO_WA_PATH = os.path.join(os.path.dirname(__file__), "..", "assets", "logo-watermark.png")


def requiere_admin(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")
    return verificar_token(authorization.split(" ")[1])


def procesar_foto(datos_imagen: bytes, redimensionar: bool = True, marca_agua: bool = False) -> bytes:
    """Redimensiona y comprime. La marca de agua se aplica en el navegador (Canvas)."""
    img = Image.open(io.BytesIO(datos_imagen)).convert("RGB")
    if redimensionar and img.width > ANCHO_MAX_FOTO:
        ratio = ANCHO_MAX_FOTO / img.width
        img = img.resize((ANCHO_MAX_FOTO, int(img.height * ratio)), Image.LANCZOS)
    buffer = io.BytesIO()
    img.save(buffer, format="WEBP", quality=CALIDAD_COMPRESION, method=4)
    return buffer.getvalue()



@router.post("/subir/{coche_id}")
async def subir_fotos(
    coche_id: int,
    fotos: List[UploadFile] = File(...),
    authorization: str = Header(...),
    redimensionar: bool = Query(True),
    marca_agua: bool = Query(True),
):
    requiere_admin(authorization)
    max_bytes    = MAX_FOTO_MB * 1024 * 1024
    urls_subidas = []

    async with httpx.AsyncClient() as client:
        for foto in fotos:
            if foto.content_type not in ("image/jpeg", "image/png", "image/webp"):
                raise HTTPException(status_code=400, detail=f"Formato no permitido: {foto.filename}")

            datos = await foto.read()
            if len(datos) > max_bytes:
                raise HTTPException(status_code=400, detail=f"{foto.filename} supera {MAX_FOTO_MB}MB")

            datos_procesados = procesar_foto(datos, redimensionar=redimensionar, marca_agua=marca_agua)
            nombre_archivo   = f"{coche_id}/{int(time.time() * 1000)}.jpg"

            resp = await client.post(
                f"{URL_STORAGE}/{nombre_archivo}",
                headers={**HEADERS_SERVICE, "Content-Type": "image/jpeg", "x-upsert": "true"},
                content=datos_procesados,
            )
            if resp.status_code not in (200, 201):
                raise HTTPException(status_code=500, detail=f"Error al subir {foto.filename}")

            url_publica = f"{URL_STORAGE_PUBLICO}/{nombre_archivo}"
            urls_subidas.append(url_publica)

            resp_count = await client.get(
                f"{SUPABASE_URL}/rest/v1/fotos_coches",
                headers=HEADERS_SERVICE,
                params={"select": "id", "coche_id": f"eq.{coche_id}"},
            )
            orden_actual = len(resp_count.json()) + 1

            await client.post(
                f"{SUPABASE_URL}/rest/v1/fotos_coches",
                headers={**HEADERS_SERVICE, "Prefer": "return=minimal"},
                json={"coche_id": coche_id, "url": url_publica, "orden": orden_actual},
            )

        # Portada automática si no tiene
        if urls_subidas:
            resp_check = await client.get(
                f"{SUPABASE_URL}/rest/v1/coches",
                headers=HEADERS_SERVICE,
                params={"select": "foto_portada", "id": f"eq.{coche_id}"},
            )
            datos_coche = resp_check.json()
            if datos_coche and not datos_coche[0].get("foto_portada"):
                await client.patch(
                    f"{SUPABASE_URL}/rest/v1/coches",
                    headers=HEADERS_SERVICE,
                    params={"id": f"eq.{coche_id}"},
                    json={"foto_portada": urls_subidas[0]},
                )

    return {"ok": True, "subidas": len(urls_subidas), "urls": urls_subidas}


@router.get("/{coche_id}")
async def listar_fotos(coche_id: int):
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/fotos_coches",
            headers=HEADERS_SERVICE,
            params={"select": "*", "coche_id": f"eq.{coche_id}", "order": "orden.asc"},
        )
    return resp.json() if resp.status_code == 200 else []


@router.delete("/{foto_id}")
async def eliminar_foto(foto_id: int, authorization: str = Header(...)):
    requiere_admin(authorization)
    async with httpx.AsyncClient() as client:
        resp = await client.delete(
            f"{SUPABASE_URL}/rest/v1/fotos_coches",
            headers=HEADERS_SERVICE,
            params={"id": f"eq.{foto_id}"},
        )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Error al eliminar foto")
    return {"ok": True, "eliminada": foto_id}
