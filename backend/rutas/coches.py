"""
rutas/coches.py — Gestión completa de coches.
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
    foto_portada: Optional[str] = None


def requiere_admin(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")
    return verificar_token(authorization.split(" ")[1])


@router.get("")
async def listar_coches(
    marca: Optional[str] = Query(None),
    combustible: Optional[str] = Query(None),
    carroceria: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    precio_max: Optional[float] = Query(None),
    km_max: Optional[int] = Query(None),
    orden: Optional[str] = Query("creado_at.desc"),
):
    params = {"select": "*", "order": orden}
    if marca:       params["marca"]       = f"ilike.*{marca}*"
    if combustible: params["combustible"] = f"eq.{combustible}"
    if carroceria:  params["carroceria"]  = f"eq.{carroceria}"
    if estado:      params["estado"]      = f"eq.{estado}"
    if precio_max:  params["precio"]      = f"lte.{precio_max}"
    if km_max:      params["km"]          = f"lte.{km_max}"

    async with httpx.AsyncClient() as client:
        resp = await client.get(URL_TABLA, headers=HEADERS_SERVICE, params=params)

    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Error al obtener coches" if ENTORNO != "desarrollo" else f"Supabase {resp.status_code}: {resp.text}")
    return resp.json()


@router.get("/destacados")
async def coches_destacados():
    params = {"select": "*", "destacado": "eq.true", "estado": "eq.disponible", "order": "creado_at.desc"}
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
    return data[0] if isinstance(data, list) else data


@router.post("/{coche_id}/duplicar")
async def duplicar_coche(coche_id: int, authorization: str = Header(...)):
    """Duplica un coche existente con todos sus datos."""
    requiere_admin(authorization)

    async with httpx.AsyncClient() as client:
        resp = await client.get(URL_TABLA, headers=HEADERS_SERVICE, params={"select": "*", "id": f"eq.{coche_id}"})

    data = resp.json()
    if not data:
        raise HTTPException(status_code=404, detail="Coche no encontrado")

    coche = data[0]
    # Quitar campos que no se deben duplicar
    for campo in ["id", "creado_at", "actualizado_at", "foto_portada"]:
        coche.pop(campo, None)
    coche["estado"] = "disponible"
    coche["marca"] = f"{coche['marca']} (copia)"

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            URL_TABLA,
            headers={**HEADERS_SERVICE, "Prefer": "return=representation"},
            json=coche,
        )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail="Error al duplicar")
    data = resp.json()
    return data[0] if isinstance(data, list) else data


@router.patch("/{coche_id}")
async def editar_coche(coche_id: int, cambios: CocheEditar, authorization: str = Header(...)):
    requiere_admin(authorization)
    payload = {k: v for k, v in cambios.dict().items() if v is not None}
    if not payload:
        raise HTTPException(status_code=400, detail="No se enviaron cambios")
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            URL_TABLA,
            headers={**HEADERS_SERVICE, "Prefer": "return=representation"},
            params={"id": f"eq.{coche_id}"},
            json=payload,
        )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail=f"Error al editar: {resp.text}")
    return {"ok": True, "id": coche_id}


@router.patch("/{coche_id}/estado")
async def cambiar_estado(coche_id: int, estado: str, authorization: str = Header(...)):
    requiere_admin(authorization)
    estados_validos = ["disponible", "reservado", "vendido"]
    if estado not in estados_validos:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Usa: {estados_validos}")
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            URL_TABLA,
            headers=HEADERS_SERVICE,
            params={"id": f"eq.{coche_id}"},
            json={"estado": estado},
        )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Error al cambiar estado")
    return {"ok": True, "id": coche_id, "estado": estado}


@router.patch("/{coche_id}/orden-fotos")
async def actualizar_orden_fotos(coche_id: int, orden: list[int], authorization: str = Header(...)):
    """Actualiza el orden de las fotos de un coche."""
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
    """Registra una visita a la ficha de un coche. No requiere auth."""
    async with httpx.AsyncClient() as client:
        # Obtener visitas actuales
        resp = await client.get(
            URL_TABLA, headers=HEADERS_SERVICE,
            params={"select": "visitas", "id": f"eq.{coche_id}"},
        )
        data = resp.json()
        if not data:
            return {"ok": False}
        visitas_actuales = data[0].get("visitas") or 0
        await client.patch(
            URL_TABLA, headers=HEADERS_SERVICE,
            params={"id": f"eq.{coche_id}"},
            json={"visitas": visitas_actuales + 1},
        )
    return {"ok": True, "visitas": visitas_actuales + 1}


@router.delete("/{coche_id}")
async def eliminar_coche(coche_id: int, authorization: str = Header(...)):
    requiere_admin(authorization)
    async with httpx.AsyncClient() as client:
        resp = await client.delete(
            URL_TABLA,
            headers=HEADERS_SERVICE,
            params={"id": f"eq.{coche_id}"},
        )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Error al eliminar")
    return {"ok": True, "eliminado": coche_id}
