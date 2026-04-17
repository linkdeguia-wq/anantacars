"""
rutas/coches.py — Gestión completa de coches con historial de cambios.
"""

from fastapi import APIRouter, HTTPException, Header, Query
from pydantic import BaseModel
from typing import Optional
import httpx
from config import SUPABASE_URL, HEADERS_SERVICE, ENTORNO
from rutas.auth import verificar_token

router = APIRouter()
TABLA     = "coches"
URL_TABLA = f"{SUPABASE_URL}/rest/v1/{TABLA}"


class CocheNuevo(BaseModel):
    marca: str
    modelo: str
    anio: int
    precio: float
    precio_anterior: Optional[float] = None
    km: int
    combustible: str
    caja: str
    cv: Optional[int] = None
    carroceria: str
    color: Optional[str] = None
    descripcion: Optional[str] = None
    notas_internas: Optional[str] = None
    video_youtube: Optional[str] = None
    etiqueta_dgt: Optional[str] = None
    estado: str = "disponible"
    destacado: bool = False

class CocheEditar(BaseModel):
    marca: Optional[str] = None
    modelo: Optional[str] = None
    anio: Optional[int] = None
    precio: Optional[float] = None
    precio_anterior: Optional[float] = None
    km: Optional[int] = None
    combustible: Optional[str] = None
    caja: Optional[str] = None
    cv: Optional[int] = None
    carroceria: Optional[str] = None
    color: Optional[str] = None
    descripcion: Optional[str] = None
    notas_internas: Optional[str] = None
    video_youtube: Optional[str] = None
    estado: Optional[str] = None
    destacado: Optional[bool] = None
    puertas: Optional[int] = None
    plazas: Optional[int] = None
    propietarios: Optional[int] = None
    itv_hasta: Optional[str] = None
    consumo: Optional[str] = None
    garantia_meses: Optional[int] = None
    etiqueta_dgt: Optional[str] = None
    historial_km: Optional[str] = None
    foto_portada: Optional[str] = None


def requiere_admin(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")
    return verificar_token(authorization.split(" ")[1])


async def registrar_historial(coche_id: int, campo: str, anterior, nuevo):
    """Registra un cambio en el historial."""
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{SUPABASE_URL}/rest/v1/historial_cambios",
                headers={**HEADERS_SERVICE, "Prefer": "return=minimal"},
                json={
                    "coche_id": coche_id,
                    "campo": campo,
                    "valor_anterior": str(anterior) if anterior is not None else None,
                    "valor_nuevo": str(nuevo) if nuevo is not None else None,
                }
            )
    except Exception:
        pass  # No interrumpir flujo por error en historial


@router.get("")
async def listar_coches(
    marca: Optional[str] = Query(None),
    combustible: Optional[str] = Query(None),
    carroceria: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    precio_max: Optional[float] = Query(None),
    km_max: Optional[int] = Query(None),
    orden: Optional[str] = Query("creado_at.desc"),
    pagina: Optional[int] = Query(1),
    por_pagina: Optional[int] = Query(12),
    etiqueta: Optional[str] = Query(None),
    q: Optional[str] = Query(None),   # búsqueda libre: "seat leon blanco"
):
    params = {"select": "*", "order": orden}
    if marca:       params["marca"]        = f"ilike.*{marca}*"
    if combustible: params["combustible"]  = f"eq.{combustible}"
    if carroceria:  params["carroceria"]   = f"eq.{carroceria}"
    if estado:      params["estado"]       = f"eq.{estado}"
    if precio_max:  params["precio"]       = f"lte.{precio_max}"
    if km_max:      params["km"]           = f"lte.{km_max}"
    if etiqueta:    params["etiqueta_dgt"] = f"eq.{etiqueta}"
    if q:
        termino = q.strip().replace("'", "")   # sanitizar
        params["or"] = f"(marca.ilike.*{termino}*,modelo.ilike.*{termino}*,color.ilike.*{termino}*,carroceria.ilike.*{termino}*,descripcion.ilike.*{termino}*)"

    # Paginación
    offset = (pagina - 1) * por_pagina
    params["limit"]  = por_pagina
    params["offset"] = offset

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            URL_TABLA, headers={**HEADERS_SERVICE, "Prefer": "count=exact"},
            params=params
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Error al obtener coches" if ENTORNO != "desarrollo" else f"Supabase {resp.status_code}: {resp.text}")

    total = int(resp.headers.get("content-range", "0/0").split("/")[-1] or 0)
    return {
        "coches": resp.json(),
        "total": total,
        "pagina": pagina,
        "por_pagina": por_pagina,
        "hay_mas": offset + por_pagina < total,
    }


@router.get("/destacados")
async def coches_destacados():
    params = {"select": "*", "destacado": "eq.true", "estado": "eq.disponible", "order": "creado_at.desc", "limit": 6}
    async with httpx.AsyncClient() as client:
        resp = await client.get(URL_TABLA, headers=HEADERS_SERVICE, params=params)
    return resp.json() if resp.status_code == 200 else []


@router.get("/stats")
async def estadisticas(authorization: str = Header(...)):
    """Dashboard de estadísticas para el panel."""
    requiere_admin(authorization)
    async with httpx.AsyncClient() as client:
        # Contar por estado
        resp_todos = await client.get(URL_TABLA, headers={**HEADERS_SERVICE, "Prefer": "count=exact"}, params={"select": "id", "limit": 0})
        resp_disp  = await client.get(URL_TABLA, headers={**HEADERS_SERVICE, "Prefer": "count=exact"}, params={"select": "id", "estado": "eq.disponible", "limit": 0})
        resp_res   = await client.get(URL_TABLA, headers={**HEADERS_SERVICE, "Prefer": "count=exact"}, params={"select": "id", "estado": "eq.reservado", "limit": 0})
        resp_vend  = await client.get(URL_TABLA, headers={**HEADERS_SERVICE, "Prefer": "count=exact"}, params={"select": "id", "estado": "eq.vendido", "limit": 0})
        # Visitas totales
        resp_vis = await client.get(URL_TABLA, headers=HEADERS_SERVICE, params={"select": "visitas", "order": "visitas.desc", "limit": 5})
        # Precio medio
        resp_precios = await client.get(URL_TABLA, headers=HEADERS_SERVICE, params={"select": "precio", "estado": "eq.disponible"})

    def count(r): return int(r.headers.get("content-range", "0/0").split("/")[-1] or 0)

    precios = [c["precio"] for c in resp_precios.json() if c.get("precio")]
    precio_medio = round(sum(precios) / len(precios)) if precios else 0

    top_visitas = resp_vis.json() if resp_vis.status_code == 200 else []
    visitas_totales = sum(c.get("visitas", 0) or 0 for c in top_visitas)

    return {
        "total":          count(resp_todos),
        "disponibles":    count(resp_disp),
        "reservados":     count(resp_res),
        "vendidos":       count(resp_vend),
        "precio_medio":   precio_medio,
        "visitas_totales": visitas_totales,
    }


@router.get("/comparar")
async def comparar_coches(ids: str = Query(..., description="IDs separados por coma: 1,2,3")):
    """Devuelve datos de varios coches para comparar."""
    id_list = [i.strip() for i in ids.split(",") if i.strip().isdigit()][:3]
    if not id_list:
        raise HTTPException(status_code=400, detail="IDs inválidos")
    params = {"select": "*", "id": f"in.({','.join(id_list)})"}
    async with httpx.AsyncClient() as client:
        resp = await client.get(URL_TABLA, headers=HEADERS_SERVICE, params=params)
    return resp.json() if resp.status_code == 200 else []


@router.get("/{coche_id}")
async def ficha_coche(coche_id: int):
    params = {"select": "*", "id": f"eq.{coche_id}"}
    async with httpx.AsyncClient() as client:
        resp = await client.get(URL_TABLA, headers=HEADERS_SERVICE, params=params)
    data = resp.json()
    if not data:
        raise HTTPException(status_code=404, detail="Coche no encontrado")
    return data[0]


@router.get("/{coche_id}/historial")
async def historial_coche(coche_id: int, authorization: str = Header(...)):
    """Historial de cambios de un coche."""
    requiere_admin(authorization)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/historial_cambios",
            headers=HEADERS_SERVICE,
            params={"select": "*", "coche_id": f"eq.{coche_id}", "order": "creado_at.desc", "limit": 50},
        )
    return resp.json() if resp.status_code == 200 else []


@router.post("")
async def crear_coche(coche: CocheNuevo, authorization: str = Header(...)):
    requiere_admin(authorization)
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            URL_TABLA,
            headers={**HEADERS_SERVICE, "Prefer": "return=representation"},
            json=coche.dict(),
        )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail=f"Error al crear: {resp.text}")
    data = resp.json()
    nuevo = data[0] if isinstance(data, list) else data
    await registrar_historial(nuevo["id"], "creado", None, f"{coche.marca} {coche.modelo}")
    return nuevo


@router.post("/{coche_id}/duplicar")
async def duplicar_coche(coche_id: int, authorization: str = Header(...)):
    requiere_admin(authorization)
    async with httpx.AsyncClient() as client:
        resp = await client.get(URL_TABLA, headers=HEADERS_SERVICE, params={"select": "*", "id": f"eq.{coche_id}"})
    data = resp.json()
    if not data:
        raise HTTPException(status_code=404, detail="Coche no encontrado")
    coche = data[0]
    for campo in ["id", "creado_at", "actualizado_at", "foto_portada", "visitas"]:
        coche.pop(campo, None)
    coche["estado"] = "disponible"
    coche["marca"]  = f"{coche['marca']} (copia)"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            URL_TABLA,
            headers={**HEADERS_SERVICE, "Prefer": "return=representation"},
            json=coche,
        )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail="Error al duplicar")
    data = resp.json()
    nuevo = data[0] if isinstance(data, list) else data
    await registrar_historial(nuevo["id"], "duplicado", None, f"Copia de #{coche_id}")
    return nuevo


@router.patch("/{coche_id}")
async def editar_coche(coche_id: int, cambios: CocheEditar, authorization: str = Header(...)):
    requiere_admin(authorization)
    payload = {k: v for k, v in cambios.dict().items() if v is not None}
    if not payload:
        raise HTTPException(status_code=400, detail="No se enviaron cambios")

    # Obtener valores anteriores para historial
    async with httpx.AsyncClient() as client:
        resp_anterior = await client.get(URL_TABLA, headers=HEADERS_SERVICE, params={"select": "*", "id": f"eq.{coche_id}"})

    datos_anteriores = resp_anterior.json()[0] if resp_anterior.json() else {}

    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            URL_TABLA,
            headers={**HEADERS_SERVICE, "Prefer": "return=representation"},
            params={"id": f"eq.{coche_id}"},
            json=payload,
        )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail=f"Error al editar: {resp.text}")

    # Registrar cambios importantes en historial
    campos_importantes = ["precio", "estado", "destacado", "descripcion"]
    for campo in campos_importantes:
        if campo in payload and datos_anteriores.get(campo) != payload[campo]:
            await registrar_historial(coche_id, campo, datos_anteriores.get(campo), payload[campo])

    return {"ok": True, "id": coche_id}


@router.patch("/{coche_id}/estado")
async def cambiar_estado(coche_id: int, estado: str, authorization: str = Header(...)):
    requiere_admin(authorization)
    estados_validos = ["disponible", "reservado", "vendido"]
    if estado not in estados_validos:
        raise HTTPException(status_code=400, detail=f"Estado inválido")

    # Obtener estado anterior
    async with httpx.AsyncClient() as client:
        resp_ant = await client.get(URL_TABLA, headers=HEADERS_SERVICE, params={"select": "estado", "id": f"eq.{coche_id}"})
    estado_anterior = resp_ant.json()[0].get("estado") if resp_ant.json() else None

    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            URL_TABLA, headers=HEADERS_SERVICE,
            params={"id": f"eq.{coche_id}"},
            json={"estado": estado},
        )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Error al cambiar estado")

    await registrar_historial(coche_id, "estado", estado_anterior, estado)
    return {"ok": True, "id": coche_id, "estado": estado}


@router.patch("/{coche_id}/orden-fotos")
async def actualizar_orden_fotos(coche_id: int, orden: list[int], authorization: str = Header(...)):
    requiere_admin(authorization)
    async with httpx.AsyncClient() as client:
        for i, foto_id in enumerate(orden):
            await client.patch(
                f"{SUPABASE_URL}/rest/v1/fotos_coches",
                headers=HEADERS_SERVICE,
                params={"id": f"eq.{foto_id}", "coche_id": f"eq.{coche_id}"},
                json={"orden": i + 1},
            )
    return {"ok": True}


@router.post("/{coche_id}/visita")
async def registrar_visita(coche_id: int):
    async with httpx.AsyncClient() as client:
        resp = await client.get(URL_TABLA, headers=HEADERS_SERVICE, params={"select": "visitas", "id": f"eq.{coche_id}"})
        data = resp.json()
        if not data:
            return {"ok": False}
        visitas = (data[0].get("visitas") or 0) + 1
        await client.patch(URL_TABLA, headers=HEADERS_SERVICE, params={"id": f"eq.{coche_id}"}, json={"visitas": visitas})
    return {"ok": True, "visitas": visitas}


@router.delete("/{coche_id}")
async def eliminar_coche(coche_id: int, authorization: str = Header(...)):
    requiere_admin(authorization)
    async with httpx.AsyncClient() as client:
        resp = await client.delete(URL_TABLA, headers=HEADERS_SERVICE, params={"id": f"eq.{coche_id}"})
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Error al eliminar")
    return {"ok": True, "eliminado": coche_id}


# ── BADGE DE PRECIO ────────────────────────────────────────────────────────────
@router.get("/badge-precio/{coche_id}")
async def badge_precio(coche_id: int):
    """
    Compara el precio del coche contra la media de coches similares
    (misma marca/modelo, ±3 años) y devuelve un badge.
    """
    async with httpx.AsyncClient() as client:
        # Obtener coche
        resp = await client.get(URL_TABLA, headers=HEADERS_SERVICE,
                                params={"select": "precio,marca,modelo,anio,km", "id": f"eq.{coche_id}"})
        data = resp.json()
        if not data:
            return {"badge": None}
        c = data[0]

        # Buscar coches similares (mismo modelo, ±3 años, disponibles)
        resp_sim = await client.get(URL_TABLA, headers=HEADERS_SERVICE, params={
            "select": "precio",
            "modelo": f"ilike.*{c['modelo']}*",
            "estado": "eq.disponible",
            "id": f"neq.{coche_id}",
        })
        similares = [x["precio"] for x in resp_sim.json() if x.get("precio") and abs(0) < 999999]

    if len(similares) < 2:
        return {"badge": None}  # No hay suficientes datos

    media = sum(similares) / len(similares)
    precio = c["precio"]
    diff_pct = (media - precio) / media * 100

    if diff_pct >= 12:
        return {"badge": "super_precio", "label": "🔥 Super precio", "color": "#1a6b3a", "text_color": "#7fffaa", "diff": round(diff_pct)}
    elif diff_pct >= 5:
        return {"badge": "buen_precio", "label": "✅ Buen precio", "color": "#1a3a6b", "text_color": "#7fc4ff", "diff": round(diff_pct)}
    elif diff_pct >= -5:
        return {"badge": "precio_justo", "label": "⚖️ Precio justo", "color": "#3a3a1a", "text_color": "#fff7aa", "diff": round(diff_pct)}
    else:
        return {"badge": None}
