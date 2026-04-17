"""
rutas/config_negocio.py — Configuración del negocio.
Tabla configuracion_negocio con una sola fila (id=1).
"""

from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import httpx
import io
from PIL import Image
from config import SUPABASE_URL, HEADERS_SERVICE, BUCKET_FOTOS
from rutas.auth import verificar_token

router = APIRouter()
TABLA = f"{SUPABASE_URL}/rest/v1/configuracion_negocio"
URL_STORAGE         = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_FOTOS}"
URL_STORAGE_PUBLICO = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_FOTOS}"


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
    coletilla_descripcion: Optional[str] = None
    instagram: Optional[str] = None
    tiktok: Optional[str] = None
    facebook: Optional[str] = None
    youtube: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    horario: Optional[str] = None
    resenas_place_id: Optional[str] = None
    hero_imagen: Optional[str] = None   # URL imagen de fondo del hero


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


@router.post("/hero-imagen")
async def subir_hero_imagen(
    archivo: UploadFile = File(...),
    authorization: str = Header(...),
):
    """
    Sube y guarda la imagen de fondo del hero.
    - Se comprime y redimensiona a máx 1920px con Pillow
    - Se guarda en Supabase Storage en config/hero.jpg (siempre sobreescribe)
    - Actualiza hero_imagen en configuracion_negocio
    """
    requiere_admin(authorization)

    if archivo.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Formato no permitido. Usa JPG, PNG o WebP.")

    datos = await archivo.read()
    if len(datos) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="La imagen supera 15MB.")

    # Comprimir con Pillow (segunda pasada — la primera fue en el navegador)
    try:
        img = Image.open(io.BytesIO(datos)).convert("RGB")
        max_w = 1920
        if img.width > max_w:
            ratio = max_w / img.width
            img = img.resize((max_w, int(img.height * ratio)), Image.LANCZOS)
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=82, optimize=True)
        datos_procesados = buffer.getvalue()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo procesar la imagen: {str(e)}")

    # Subir a Supabase Storage — siempre en la misma ruta (upsert)
    nombre = "config/hero.jpg"
    async with httpx.AsyncClient() as client:
        resp_storage = await client.post(
            f"{URL_STORAGE}/{nombre}",
            headers={**HEADERS_SERVICE, "Content-Type": "image/jpeg", "x-upsert": "true"},
            content=datos_procesados,
        )
    if resp_storage.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail="Error al subir imagen a Storage.")

    # URL pública con cache-bust para que el navegador refresque
    import time
    url_publica = f"{URL_STORAGE_PUBLICO}/{nombre}?v={int(time.time())}"
    # Guardar URL limpia (sin cache-bust) en config — el cache-bust lo añade el cliente
    url_config = f"{URL_STORAGE_PUBLICO}/{nombre}"

    async with httpx.AsyncClient() as client:
        resp_cfg = await client.patch(
            TABLA, headers=HEADERS_SERVICE,
            params={"id": "eq.1"},
            json={"hero_imagen": url_config},
        )
    if resp_cfg.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Imagen subida pero error al guardar en config.")

    return {"ok": True, "url": url_config}


@router.delete("/hero-imagen")
async def eliminar_hero_imagen(authorization: str = Header(...)):
    """Elimina la imagen del hero — vuelve al fondo oscuro por defecto."""
    requiere_admin(authorization)
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            TABLA, headers=HEADERS_SERVICE,
            params={"id": "eq.1"},
            json={"hero_imagen": None},
        )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Error al eliminar imagen.")
    return {"ok": True}
