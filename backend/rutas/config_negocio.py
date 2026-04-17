"""
rutas/config_negocio.py — Configuración del negocio.
Tabla configuracion_negocio con una sola fila (id=1).
"""

from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import httpx, io, time
from PIL import Image
from config import SUPABASE_URL, HEADERS_SERVICE, BUCKET_FOTOS
from rutas.auth import verificar_token

router = APIRouter()
TABLA               = f"{SUPABASE_URL}/rest/v1/configuracion_negocio"
URL_STORAGE         = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_FOTOS}"
URL_STORAGE_PUBLICO = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_FOTOS}"


class ConfigUpdate(BaseModel):
    # Negocio
    nombre_negocio: Optional[str] = None
    whatsapp: Optional[str] = None
    telefono: Optional[str] = None
    dominio: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    horario: Optional[str] = None
    # Identidad visual
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    color_acento: Optional[str] = None
    # Hero
    hero_titulo: Optional[str] = None
    hero_subtitulo: Optional[str] = None
    hero_imagen: Optional[str] = None
    # Banner
    banner_activo: Optional[bool] = None
    banner_texto: Optional[str] = None
    banner_color: Optional[str] = None
    # SEO
    meta_description: Optional[str] = None
    analytics_id: Optional[str] = None
    # Módulos
    modulo_calculadora: Optional[bool] = None
    modulo_comparador: Optional[bool] = None
    modulo_alertas: Optional[bool] = None
    modulo_chat: Optional[bool] = None
    modulo_resenas: Optional[bool] = None
    # Financiación
    calc_tin: Optional[float] = None
    calc_plazo_max: Optional[int] = None
    calc_entrada_min: Optional[int] = None
    # Garantía
    garantia_activa: Optional[bool] = None
    garantia_texto: Optional[str] = None
    # IA
    coletilla_descripcion: Optional[str] = None
    # Chat
    chat_codigo: Optional[str] = None
    # Redes
    instagram: Optional[str] = None
    tiktok: Optional[str] = None
    facebook: Optional[str] = None
    youtube: Optional[str] = None
    resenas_place_id: Optional[str] = None


def requiere_admin(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")
    return verificar_token(authorization.split(" ")[1])


async def _subir_storage(nombre: str, datos: bytes, content_type: str) -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{URL_STORAGE}/{nombre}",
            headers={**HEADERS_SERVICE, "Content-Type": content_type, "x-upsert": "true"},
            content=datos,
        )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail=f"Error al subir a Storage ({resp.status_code}).")
    return f"{URL_STORAGE_PUBLICO}/{nombre}"


async def _guardar_campo(campo: str, valor):
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            TABLA, headers=HEADERS_SERVICE,
            params={"id": "eq.1"},
            json={campo: valor},
        )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Archivo subido pero error al guardar en config.")


@router.get("")
async def obtener_config():
    async with httpx.AsyncClient() as client:
        resp = await client.get(TABLA, headers=HEADERS_SERVICE, params={"select": "*", "id": "eq.1"})
    data = resp.json()
    if not data:
        return {}
    cfg = data[0]
    cfg.pop("chat_codigo", None)
    return cfg


@router.get("/admin")
async def obtener_config_admin(authorization: str = Header(...)):
    requiere_admin(authorization)
    async with httpx.AsyncClient() as client:
        resp = await client.get(TABLA, headers=HEADERS_SERVICE, params={"select": "*", "id": "eq.1"})
    data = resp.json()
    return data[0] if data else {}


@router.patch("")
async def actualizar_config(cambios: ConfigUpdate, authorization: str = Header(...)):
    requiere_admin(authorization)
    payload = {k: v for k, v in cambios.dict().items() if v is not None}
    if not payload:
        raise HTTPException(status_code=400, detail="No se enviaron cambios.")
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            TABLA, headers=HEADERS_SERVICE,
            params={"id": "eq.1"},
            json=payload,
        )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Error al guardar configuración.")
    return {"ok": True}


# ── LOGO ──────────────────────────────────────────────────────────────────────
@router.post("/logo")
async def subir_logo(archivo: UploadFile = File(...), authorization: str = Header(...)):
    requiere_admin(authorization)
    ct = archivo.content_type or ""
    if ct not in ("image/png", "image/jpeg", "image/webp", "image/svg+xml"):
        raise HTTPException(status_code=400, detail="Usa PNG, JPG, WebP o SVG.")
    datos = await archivo.read()
    if len(datos) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El logo supera 5 MB.")
    if ct == "image/svg+xml":
        url = await _subir_storage("config/logo.svg", datos, "image/svg+xml")
        await _guardar_campo("logo_url", url)
        return {"ok": True, "url": url}
    try:
        img = Image.open(io.BytesIO(datos))
        tiene_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
        if img.width > 400:
            ratio = 400 / img.width
            img = img.resize((400, int(img.height * ratio)), Image.LANCZOS)
        buf = io.BytesIO()
        if tiene_alpha:
            img.convert("RGBA").save(buf, format="PNG", optimize=True)
            ext, ctype = "png", "image/png"
        else:
            img.convert("RGB").save(buf, format="WEBP", quality=90, method=4)
            ext, ctype = "webp", "image/webp"
        url = await _subir_storage(f"config/logo.{ext}", buf.getvalue(), ctype)
        await _guardar_campo("logo_url", url)
        return {"ok": True, "url": url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al procesar logo: {e}")


@router.delete("/logo")
async def eliminar_logo(authorization: str = Header(...)):
    requiere_admin(authorization)
    async with httpx.AsyncClient() as client:
        await client.patch(TABLA, headers=HEADERS_SERVICE, params={"id": "eq.1"}, json={"logo_url": None})
    return {"ok": True}


# ── FAVICON ───────────────────────────────────────────────────────────────────
@router.post("/favicon")
async def subir_favicon(archivo: UploadFile = File(...), authorization: str = Header(...)):
    requiere_admin(authorization)
    ct = archivo.content_type or ""
    if ct not in ("image/png", "image/jpeg", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"):
        raise HTTPException(status_code=400, detail="Usa PNG, JPG, WebP o ICO.")
    datos = await archivo.read()
    if ct in ("image/x-icon", "image/vnd.microsoft.icon"):
        url = await _subir_storage("config/favicon.ico", datos, "image/x-icon")
    else:
        try:
            img = Image.open(io.BytesIO(datos)).convert("RGBA")
            img = img.resize((32, 32), Image.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            url = await _subir_storage("config/favicon.png", buf.getvalue(), "image/png")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error al procesar favicon: {e}")
    await _guardar_campo("favicon_url", url)
    return {"ok": True, "url": url}


@router.delete("/favicon")
async def eliminar_favicon(authorization: str = Header(...)):
    requiere_admin(authorization)
    async with httpx.AsyncClient() as client:
        await client.patch(TABLA, headers=HEADERS_SERVICE, params={"id": "eq.1"}, json={"favicon_url": None})
    return {"ok": True}


# ── HERO IMAGEN ───────────────────────────────────────────────────────────────
@router.post("/hero-imagen")
async def subir_hero_imagen(archivo: UploadFile = File(...), authorization: str = Header(...)):
    requiere_admin(authorization)
    if archivo.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Usa JPG, PNG o WebP.")
    datos = await archivo.read()
    if len(datos) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="La imagen supera 15 MB.")
    try:
        img = Image.open(io.BytesIO(datos)).convert("RGB")
        if img.width > 1920:
            ratio = 1920 / img.width
            img = img.resize((1920, int(img.height * ratio)), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=82, optimize=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al procesar imagen: {e}")
    url = await _subir_storage("config/hero.jpg", buf.getvalue(), "image/jpeg")
    await _guardar_campo("hero_imagen", url)
    return {"ok": True, "url": url}


@router.delete("/hero-imagen")
async def eliminar_hero_imagen(authorization: str = Header(...)):
    requiere_admin(authorization)
    async with httpx.AsyncClient() as client:
        await client.patch(TABLA, headers=HEADERS_SERVICE, params={"id": "eq.1"}, json={"hero_imagen": None})
    return {"ok": True}
