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

from rutas import coches, fotos, auth, redes, alertas
from rutas import config_negocio, ia

app = FastAPI(
    title=f"{NOMBRE_NEGOCIO} API",
    description="Backend para web de compraventa de coches",
    version="2.0.0",
    docs_url="/docs" if ENTORNO == "desarrollo" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(coches.router,         prefix="/api/coches",   tags=["Coches"])
app.include_router(fotos.router,          prefix="/api/fotos",    tags=["Fotos"])
app.include_router(auth.router,           prefix="/api/auth",     tags=["Auth"])
app.include_router(redes.router,          prefix="/api/redes",    tags=["Redes"])
app.include_router(alertas.router,        prefix="/api/alertas",  tags=["Alertas"])
app.include_router(config_negocio.router, prefix="/api/config",   tags=["Configuración"])
app.include_router(ia.router,           prefix="/api/ia",      tags=["IA"])


@app.get("/")
def raiz():
    return {"estado": "online", "app": NOMBRE_NEGOCIO, "version": "2.0.0", "entorno": ENTORNO}


@app.get("/sitemap.xml", response_class=Response)
async def sitemap():
    from config import SUPABASE_URL, HEADERS_SERVICE
    dominio = os.getenv("DOMINIO_WEB", "https://anantacars.vercel.app")
    urls = [f"<url><loc>{dominio}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>"]
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/coches",
                headers=HEADERS_SERVICE,
                params={"select": "id,marca,modelo,anio,actualizado_at", "order": "creado_at.desc"},
            )
        for c in resp.json():
            slug = f"{c['marca']}-{c['modelo']}-{c['anio']}".lower().replace(" ", "-")
            fecha = c.get("actualizado_at", "")[:10]
            urls.append(f"<url><loc>{dominio}/coches/{slug}-id{c['id']}</loc><lastmod>{fecha}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>")
    except Exception:
        pass
    xml = f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{"".join(urls)}</urlset>'
    return Response(content=xml, media_type="application/xml")
