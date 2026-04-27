"""
main.py — Servidor FastAPI. Punto de entrada del backend.
Arrancar con: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from config import ORIGINS_PERMITIDOS, NOMBRE_NEGOCIO, ENTORNO
import httpx
import os

from rutas import coches, fotos, auth, redes, alertas
from rutas import config_negocio, ia, contacto

# ── RATE LIMITER ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

app = FastAPI(
    title=f"{NOMBRE_NEGOCIO} API",
    description="Backend para web de compraventa de coches",
    version="2.0.0",
    docs_url="/docs" if ENTORNO == "desarrollo" else None,
    redoc_url=None,
    openapi_url="/openapi.json" if ENTORNO == "desarrollo" else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS — orígenes según entorno ─────────────────────────────────────────────
ORIGENES_PRODUCCION = [
    "https://anantacars.es",
    "https://www.anantacars.es",
    "https://anantacars.vercel.app",
]
origenes = ["*"] if ENTORNO == "desarrollo" else ORIGENES_PRODUCCION

app.add_middleware(
    CORSMiddleware,
    allow_origins=origenes,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    max_age=3600,
)

app.include_router(coches.router,         prefix="/api/coches",   tags=["Coches"])
app.include_router(fotos.router,          prefix="/api/fotos",    tags=["Fotos"])
app.include_router(auth.router,           prefix="/api/auth",     tags=["Auth"])
app.include_router(redes.router,          prefix="/api/redes",    tags=["Redes"])
app.include_router(alertas.router,        prefix="/api/alertas",  tags=["Alertas"])
app.include_router(config_negocio.router, prefix="/api/config",   tags=["Configuración"])
app.include_router(ia.router,             prefix="/api/ia",       tags=["IA"])
app.include_router(contacto.router,       prefix="/api/contacto", tags=["Contacto"])

# ── Manejador de errores Pydantic — no exponer schema interno ─────────────────
from fastapi.requests import Request as FastAPIRequest
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: FastAPIRequest, exc: RequestValidationError):
    """Devuelve mensaje genérico en producción, detalle solo en desarrollo."""
    if ENTORNO == "desarrollo":
        return JSONResponse(status_code=422, content={"detail": exc.errors()})
    return JSONResponse(
        status_code=400,
        content={"detail": "Datos inválidos. Revisa los campos enviados."},
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: FastAPIRequest, exc: Exception):
    """Captura excepciones no manejadas — evita filtrar tracebacks."""
    if ENTORNO == "desarrollo":
        return JSONResponse(status_code=500, content={"detail": str(exc)})
    return JSONResponse(status_code=500, content={"detail": "Error interno del servidor"})

# Exponer limiter para que los routers puedan importarlo
app.limiter = limiter


@app.get("/")
def raiz():
    return {"estado": "online", "app": NOMBRE_NEGOCIO, "version": "2.0.0", "entorno": ENTORNO}


@app.get("/sitemap.xml", response_class=Response)
async def sitemap():
    """Sitemap dinámico con todas las URLs públicas. Apunta al dominio configurado."""
    from config import SUPABASE_URL, HEADERS_SERVICE
    dominio = os.getenv("DOMINIO_WEB", "https://anantacars.es").rstrip("/")
    fecha_hoy = __import__("datetime").datetime.now().strftime("%Y-%m-%d")

    urls = [
        f"<url><loc>{dominio}/</loc><lastmod>{fecha_hoy}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>",
        f"<url><loc>{dominio}/como-comprar</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>",
        f"<url><loc>{dominio}/politica-privacidad</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>",
        f"<url><loc>{dominio}/aviso-legal</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>",
    ]
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/coches",
                headers=HEADERS_SERVICE,
                params={
                    "select": "id,marca,modelo,anio,actualizado_at,creado_at",
                    "estado": "neq.vendido",  # No incluir vendidos
                    "order": "creado_at.desc",
                },
            )
        for c in resp.json():
            slug_raw = f"{c.get('marca','')}-{c.get('modelo','')}-{c.get('anio','')}".lower()
            # Slug seguro: solo a-z 0-9 -
            slug = "".join(ch if ch.isalnum() or ch == "-" else "-" for ch in slug_raw.replace(" ", "-"))
            slug = "-".join(filter(None, slug.split("-")))  # quita dobles guiones
            fecha = (c.get("actualizado_at") or c.get("creado_at") or fecha_hoy)[:10]
            urls.append(
                f"<url><loc>{dominio}/coches/{slug}-id{c['id']}</loc>"
                f"<lastmod>{fecha}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>"
            )
    except Exception:
        pass

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        + "".join(urls) +
        '</urlset>'
    )
    return Response(content=xml, media_type="application/xml")
