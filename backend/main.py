"""
main.py — Servidor FastAPI. Punto de entrada del backend.
Arrancar con: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from config import ORIGINS_PERMITIDOS, NOMBRE_NEGOCIO, ENTORNO
import httpx
import os

# --- Importar rutas ---
from rutas import coches, fotos, auth, redes, alertas

app = FastAPI(
    title=f"{NOMBRE_NEGOCIO} API",
    description="Backend para web de compraventa de coches",
    version="1.0.0",
    docs_url="/docs" if ENTORNO == "desarrollo" else None,
)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Registrar rutas ---
app.include_router(coches.router,  prefix="/api/coches",  tags=["Coches"])
app.include_router(fotos.router,   prefix="/api/fotos",   tags=["Fotos"])
app.include_router(auth.router,    prefix="/api/auth",    tags=["Auth"])
app.include_router(redes.router,   prefix="/api/redes",   tags=["Redes"])
app.include_router(alertas.router, prefix="/api/alertas", tags=["Alertas"])


# --- Health check ---
@app.get("/")
def raiz():
    return {
        "estado": "online",
        "app": NOMBRE_NEGOCIO,
        "version": "1.0.0",
        "entorno": ENTORNO,
    }


# --- Sitemap XML (SEO) ---
@app.get("/sitemap.xml", response_class=Response)
async def sitemap():
    from config import SUPABASE_URL, HEADERS_SERVICE
    dominio = os.getenv("DOMINIO_WEB", "https://tudominio.com")
    urls = [
        f"<url><loc>{dominio}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>",
    ]
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/coches",
                headers=HEADERS_SERVICE,
                params={"select": "id,marca,modelo,anio,actualizado_at", "order": "creado_at.desc"},
            )
        for c in resp.json():
            fecha = c.get("actualizado_at", "")[:10]
            urls.append(
                f"<url>"
                f"<loc>{dominio}/ficha.html?id={c['id']}</loc>"
                f"<lastmod>{fecha}</lastmod>"
                f"<changefreq>weekly</changefreq>"
                f"<priority>0.8</priority>"
                f"</url>"
            )
    except Exception:
        pass

    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{"".join(urls)}
</urlset>"""
    return Response(content=xml, media_type="application/xml")