"""
rutas/ia.py — Endpoints de IA con Gemini 2.5 Flash.
- Escanear foto de coche → extraer datos (marca, modelo, color, año)
- Generar descripción profesional de venta
"""

from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import base64
import httpx
import json
from config import GEMINI_API_KEY, GEMINI_MODEL, ENTORNO, SUPABASE_URL, HEADERS_SERVICE
from rutas.auth import verificar_token

router = APIRouter()

GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"




async def obtener_coletilla() -> str:
    """Obtiene la coletilla configurada desde Supabase."""
    default = "En Ananta Cars garantizamos total transparencia. Todos nuestros vehículos pasan revisión mecánica antes de la venta, con documentación en regla y garantía incluida. ¿Te interesa? Pásate a verlo o contáctanos sin compromiso."
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/configuracion_negocio",
                headers=HEADERS_SERVICE,
                params={"select": "coletilla_descripcion", "id": "eq.1"}
            )
        data = resp.json()
        val = data[0].get("coletilla_descripcion") if data else None
        if val and val.strip():
            return val.strip()
    except Exception:
        pass
    return default

def requiere_admin(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")
    return verificar_token(authorization.split(" ")[1])


async def llamar_gemini(partes: list) -> str:
    """Llamada a Gemini API y devuelve el texto de respuesta."""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY no configurada en Railway")

    payload = {
        "contents": [{"parts": partes}],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 1200,
        }
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{GEMINI_URL}?key={GEMINI_API_KEY}",
            json=payload,
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Error Gemini: {resp.text[:200]}")

    data = resp.json()
    try:
        candidate = data["candidates"][0]
        finish_reason = candidate.get("finishReason", "UNKNOWN")
        text = candidate["content"]["parts"][0]["text"]
        # Si se cortó por MAX_TOKENS, intentar de nuevo con más contexto
        if finish_reason == "MAX_TOKENS":
            # Añadir punto final si falta
            text = text.rstrip() + "."
        return text
    except (KeyError, IndexError) as e:
        raise HTTPException(status_code=500, detail=f"Respuesta inesperada de Gemini: {str(data)[:300]}")


@router.post("/escanear-coche")
async def escanear_coche(
    foto: UploadFile = File(...),
    authorization: str = Header(...),
):
    """
    Analiza una foto del coche o del permiso de circulación
    y extrae marca, modelo, color, año y carrocería.
    """
    requiere_admin(authorization)

    datos_foto = await foto.read()
    b64 = base64.b64encode(datos_foto).decode("utf-8")
    mime = foto.content_type or "image/jpeg"

    prompt = """Analiza esta imagen de un vehículo o documento de vehículo.
Extrae los datos que puedas identificar y devuelve ÚNICAMENTE un JSON con este formato exacto, sin texto adicional:
{
  "marca": "SEAT",
  "modelo": "León",
  "anio": 2019,
  "color": "Blanco",
  "carroceria": "familiar",
  "combustible": "gasolina",
  "cv": null
}

Reglas:
- marca: en MAYÚSCULAS
- modelo: primera letra mayúscula
- anio: número entero o null si no se ve
- color: en español, primera letra mayúscula
- carroceria: uno de: sedan, suv, familiar, coupe, monovolumen, furgon
- combustible: uno de: gasolina, diesel, hibrido, electrico
- cv: número entero o null si no se ve
- Si no puedes determinar un campo con certeza, pon null
- No inventes datos"""

    texto = await llamar_gemini([
        {"text": prompt},
        {"inline_data": {"mime_type": mime, "data": b64}},
    ])

    # Limpiar respuesta y parsear JSON — robusto
    texto = texto.strip()
    
    # Quitar bloques markdown ```json ... ```
    if "```" in texto:
        partes = texto.split("```")
        for parte in partes:
            if parte.startswith("json"):
                texto = parte[4:].strip()
                break
            elif "{" in parte:
                texto = parte.strip()
                break
    
    # Extraer solo el JSON si hay texto extra alrededor
    inicio = texto.find("{")
    fin    = texto.rfind("}") + 1
    if inicio >= 0 and fin > inicio:
        texto = texto[inicio:fin]
    
    # Intentar parsear — si falla, extraer campos manualmente
    try:
        datos = json.loads(texto)
        return {"ok": True, "datos": datos}
    except json.JSONDecodeError:
        # Extracción manual con regex como fallback
        import re
        datos = {}
        patrones = {
            "marca":       r'"marca"\s*:\s*"([^"]*)"',
            "modelo":      r'"modelo"\s*:\s*"([^"]*)"',
            "color":       r'"color"\s*:\s*"([^"]*)"',
            "combustible": r'"combustible"\s*:\s*"([^"]*)"',
            "carroceria":  r'"carroceria"\s*:\s*"([^"]*)"',
            "anio":        r'"anio"\s*:\s*(\d{4})',
            "cv":          r'"cv"\s*:\s*(\d+)',
        }
        for campo, patron in patrones.items():
            m = re.search(patron, texto)
            if m:
                val = m.group(1)
                datos[campo] = int(val) if campo in ("anio", "cv") else val
            else:
                datos[campo] = None
        
        if datos.get("marca") or datos.get("modelo"):
            return {"ok": True, "datos": datos}
        raise HTTPException(status_code=500, detail=f"No se pudo parsear respuesta: {texto[:200]}")


class GenerarDescripcionRequest(BaseModel):
    marca: str
    modelo: str
    anio: int
    km: int
    combustible: str
    caja: str
    cv: Optional[int] = None
    color: Optional[str] = None
    carroceria: Optional[str] = None
    precio: Optional[float] = None
    extras: Optional[str] = None  # Notas del vendedor para incluir/excluir


@router.post("/generar-descripcion")
async def generar_descripcion(
    datos: GenerarDescripcionRequest,
    authorization: str = Header(...),
):
    """
    Genera una descripción profesional de venta para un coche.
    """
    requiere_admin(authorization)

    precio_txt = f"{int(datos.precio):,}€".replace(",", ".") if datos.precio else "consultar"

    coletilla = await obtener_coletilla()

    prompt = f"""Eres un redactor para un concesionario de coches de segunda mano en España.

Escribe la descripción de venta para este vehículo. Serán principalmente coches utilitarios y de uso diario.

DATOS DEL VEHÍCULO:
- Vehículo: {datos.marca} {datos.modelo} {datos.anio}
- Kilómetros: {datos.km:,} km
- Combustible: {datos.combustible} | Cambio: {datos.caja}
{f"- Potencia: {datos.cv} CV" if datos.cv else ""}
{f"- Color: {datos.color}" if datos.color else ""}
{f"- Carrocería: {datos.carroceria}" if datos.carroceria else ""}
{f"- Precio: {precio_txt}" if datos.precio else ""}
{f"- Notas del vendedor: {datos.extras}" if datos.extras else ""}

INSTRUCCIONES:
- Escribe UN solo párrafo de entre 60 y 80 palabras
- Tono natural y directo, sin exageraciones ni superlativos vacíos
- Describe el vehículo de forma honesta y adaptada a lo que es: un utilitario práctico
- Destaca puntos fuertes reales según los datos (potencia si es alta, bajo consumo si es diésel, espacio si es familiar, etc.)
- Si hay notas del vendedor, incorpóralas de forma natural
- NO repitas datos técnicos visibles en la ficha (km, año, combustible)
- NO uses palabras como: fantástico, increíble, espectacular, perfecto, ideal, oportunidad única
- NO uses asteriscos ni markdown
- NO añadas coletilla final — ya está incluida abajo
- Devuelve SOLO el párrafo descriptivo, sin título ni etiquetas

Al final del párrafo, añade exactamente este texto sin modificarlo:
{coletilla}"""

    texto = await llamar_gemini([{"text": prompt}])
    return {"ok": True, "descripcion": texto.strip()}
