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


def procesar_foto(datos_imagen: bytes, redimensionar: bool = True, marca_agua: bool = True) -> bytes:
    img = Image.open(io.BytesIO(datos_imagen)).convert("RGB")

    # 1. Redimensionar
    if redimensionar and img.width > ANCHO_MAX_FOTO:
        ratio = ANCHO_MAX_FOTO / img.width
        img = img.resize((ANCHO_MAX_FOTO, int(img.height * ratio)), Image.LANCZOS)

    # 2. Marca de agua — centrada, configurable desde panel admin
    if marca_agua:
        # Leer config de Supabase (valores por defecto si falla)
        _wa_opacidad  = 0.55   # opacidad logo (0-1)
        _wa_opacidad_txt = 140  # opacidad texto (0-255)
        _wa_tamano    = 0.45   # % del ancho de imagen
        _wa_tipo      = "logo" # "logo" o "texto"
        try:
            import httpx as _httpx
            _r = _httpx.get(
                f"{SUPABASE_URL}/rest/v1/configuracion_negocio",
                headers=HEADERS_SERVICE,
                params={"select": "wa_opacidad,wa_tamano,wa_tipo", "id": "eq.1"},
                timeout=3,
            )
            _cfg = _r.json()
            if _cfg and isinstance(_cfg, list):
                _c = _cfg[0]
                if _c.get("wa_opacidad") is not None: _wa_opacidad = float(_c["wa_opacidad"]); _wa_opacidad_txt = int(_wa_opacidad * 255)
                if _c.get("wa_tamano")   is not None: _wa_tamano   = float(_c["wa_tamano"])
                if _c.get("wa_tipo")     is not None: _wa_tipo     = _c["wa_tipo"]
        except Exception:
            pass

        try:
            usar_logo = (_wa_tipo == "logo") and os.path.exists(LOGO_WA_PATH)

            if usar_logo:
                logo_wa = Image.open(LOGO_WA_PATH).convert("RGBA")
                # Forzar logo a blanco — así se ve sobre fondos oscuros Y claros
                r_ch, g_ch, b_ch, a_ch = logo_wa.split()
                logo_blanco = Image.merge("RGBA", (
                    Image.new("L", logo_wa.size, 255),
                    Image.new("L", logo_wa.size, 255),
                    Image.new("L", logo_wa.size, 255),
                    a_ch,
                ))
                wa_w = max(160, int(img.width * _wa_tamano))
                wa_h = int(logo_wa.height * (wa_w / logo_wa.width))
                logo_blanco = logo_blanco.resize((wa_w, wa_h), Image.LANCZOS)

                font_size = max(24, int(wa_w * 0.16))
                try:
                    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
                except Exception:
                    font = ImageFont.load_default()

                tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
                tb = tmp.textbbox((0, 0), NOMBRE_NEGOCIO, font=font)
                txt_w, txt_h = tb[2] - tb[0], tb[3] - tb[1]
                gap = int(font_size * 0.4)
                total_w = max(wa_w, txt_w)
                total_h = wa_h + gap + txt_h

                wm = Image.new("RGBA", (total_w, total_h), (0, 0, 0, 0))

                # Aplicar opacidad al logo
                r2, g2, b2, a2 = logo_blanco.split()
                a2 = a2.point(lambda v: int(v * _wa_opacidad))
                logo_final = Image.merge("RGBA", (r2, g2, b2, a2))
                wm.paste(logo_final, ((total_w - wa_w) // 2, 0), logo_final)

                d = ImageDraw.Draw(wm)
                d.text(((total_w - txt_w) // 2, wa_h + gap), NOMBRE_NEGOCIO,
                       fill=(255, 255, 255, _wa_opacidad_txt), font=font)

            else:
                # Modo texto puro — más grande y legible
                font_size = max(32, int(img.width * 0.04))
                try:
                    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
                except Exception:
                    font = ImageFont.load_default()
                tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
                tb = tmp.textbbox((0, 0), NOMBRE_NEGOCIO, font=font)
                total_w, total_h = tb[2] - tb[0], tb[3] - tb[1]

                wm = Image.new("RGBA", (total_w, total_h), (0, 0, 0, 0))
                d = ImageDraw.Draw(wm)
                d.text((0, 0), NOMBRE_NEGOCIO,
                       fill=(255, 255, 255, _wa_opacidad_txt), font=font)

            # Centrar en la imagen
            base = img.convert("RGBA")
            x = (img.width  - total_w) // 2
            y = (img.height - total_h) // 2
            base.paste(wm, (x, y), wm)
            img = base.convert("RGB")

        except Exception as _e:
            print(f"[MARCA AGUA] Error: {_e}")

    # 3. Comprimir
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=CALIDAD_COMPRESION, optimize=True)
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
