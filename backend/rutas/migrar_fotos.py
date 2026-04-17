"""
migrar_fotos.py — Reprocesa fotos existentes:
  - Descarga de Supabase Storage
  - Aplica nueva marca de agua centrada y transparente
  - Convierte a WebP
  - Reemplaza en Storage y actualiza URLs en BD

Uso:
  pip install httpx pillow python-dotenv
  python migrar_fotos.py [--dry-run] [--coche-id 5]

Flags:
  --dry-run      Solo muestra qué haría, sin modificar nada
  --coche-id N   Procesa solo el coche con ese ID (para probar)
  --skip-wa      No aplica marca de agua (solo convierte a WebP)
"""

import asyncio, sys, io, os, time, argparse
import httpx
from PIL import Image, ImageDraw, ImageFont
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL        = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
NOMBRE_NEGOCIO      = os.getenv("NOMBRE_NEGOCIO", "Ananta Cars")
BUCKET              = "anantacars-fotos"
LOGO_PATH           = os.path.join(os.path.dirname(__file__), "assets", "logo-watermark.png")

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
}
URL_STORAGE         = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}"
URL_STORAGE_PUBLICO = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}"


def aplicar_marca_agua(img: Image.Image) -> Image.Image:
    """Marca de agua centrada, muy transparente."""
    try:
        logo_wa = Image.open(LOGO_PATH).convert("RGBA")
        wa_w = max(140, int(img.width * 0.35))
        wa_h = int(logo_wa.height * (wa_w / logo_wa.width))
        logo_wa = logo_wa.resize((wa_w, wa_h), Image.LANCZOS)

        font_size = max(18, int(wa_w * 0.14))
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except Exception:
            font = ImageFont.load_default()

        tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
        tb = tmp.textbbox((0, 0), NOMBRE_NEGOCIO, font=font)
        txt_w, txt_h = tb[2] - tb[0], tb[3] - tb[1]
        gap = int(font_size * 0.5)
        total_w = max(wa_w, txt_w)
        total_h = wa_h + gap + txt_h

        wm = Image.new("RGBA", (total_w, total_h), (0, 0, 0, 0))
        r, g, b, a = logo_wa.split()
        a = a.point(lambda v: int(v * 0.30))
        logo_rgba = Image.merge("RGBA", (r, g, b, a))
        wm.paste(logo_rgba, ((total_w - wa_w) // 2, 0), logo_rgba)

        draw_wm = ImageDraw.Draw(wm)
        draw_wm.text(((total_w - txt_w) // 2, wa_h + gap), NOMBRE_NEGOCIO, fill=(255, 255, 255, 55), font=font)

        base = img.convert("RGBA")
        base.paste(wm, ((img.width - total_w) // 2, (img.height - total_h) // 2), wm)
        return base.convert("RGB")
    except Exception as e:
        print(f"    ⚠ Marca de agua falló: {e} — se convierte solo a WebP")
        return img.convert("RGB")


def comprimir_webp(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=82, method=4)
    return buf.getvalue()


async def migrar(dry_run: bool, solo_coche: int | None, skip_wa: bool):
    async with httpx.AsyncClient(timeout=60) as client:

        # 1. Obtener todas las fotos (o las de un coche específico)
        params = {"select": "id,coche_id,url,orden", "order": "coche_id.asc,orden.asc"}
        if solo_coche:
            params["coche_id"] = f"eq.{solo_coche}"

        resp = await client.get(f"{SUPABASE_URL}/rest/v1/fotos_coches", headers=HEADERS, params=params)
        fotos = resp.json()
        print(f"\n{'[DRY RUN] ' if dry_run else ''}Fotos a procesar: {len(fotos)}\n")

        ok = 0
        errores = 0

        for i, foto in enumerate(fotos, 1):
            foto_id  = foto["id"]
            coche_id = foto["coche_id"]
            url_orig = foto["url"]

            print(f"[{i}/{len(fotos)}] Coche {coche_id} · foto {foto_id}")
            print(f"    URL: {url_orig[:80]}...")

            if dry_run:
                print("    → [dry-run] se procesaría")
                ok += 1
                continue

            try:
                # 2. Descargar
                dl = await client.get(url_orig)
                if dl.status_code != 200:
                    print(f"    ✗ Error descarga: {dl.status_code}")
                    errores += 1
                    continue

                # 3. Procesar
                img = Image.open(io.BytesIO(dl.content))
                if not skip_wa:
                    img = aplicar_marca_agua(img)
                else:
                    img = img.convert("RGB")
                datos_webp = comprimir_webp(img)

                # 4. Nombre nuevo en WebP
                nombre = f"{coche_id}/{int(time.time() * 1000)}_{foto_id}.webp"

                # 5. Subir
                up = await client.post(
                    f"{URL_STORAGE}/{nombre}",
                    headers={**HEADERS, "Content-Type": "image/webp", "x-upsert": "true"},
                    content=datos_webp,
                )
                if up.status_code not in (200, 201):
                    print(f"    ✗ Error subida: {up.status_code} {up.text[:100]}")
                    errores += 1
                    continue

                url_nueva = f"{URL_STORAGE_PUBLICO}/{nombre}"

                # 6. Actualizar fotos_coches
                await client.patch(
                    f"{SUPABASE_URL}/rest/v1/fotos_coches",
                    headers=HEADERS,
                    params={"id": f"eq.{foto_id}"},
                    json={"url": url_nueva},
                )

                # 7. Si era la foto_portada del coche, actualizar también la tabla coches
                resp_coche = await client.get(
                    f"{SUPABASE_URL}/rest/v1/coches",
                    headers=HEADERS,
                    params={"select": "foto_portada", "id": f"eq.{coche_id}"},
                )
                datos_coche = resp_coche.json()
                if datos_coche and datos_coche[0].get("foto_portada") == url_orig:
                    await client.patch(
                        f"{SUPABASE_URL}/rest/v1/coches",
                        headers=HEADERS,
                        params={"id": f"eq.{coche_id}"},
                        json={"foto_portada": url_nueva},
                    )
                    print(f"    ✓ Portada actualizada")

                tam_orig = len(dl.content) / 1024
                tam_nuevo = len(datos_webp) / 1024
                ahorro = (1 - tam_nuevo / tam_orig) * 100 if tam_orig else 0
                print(f"    ✓ OK — {tam_orig:.0f}KB → {tam_nuevo:.0f}KB ({ahorro:.0f}% menos)")
                ok += 1

                await asyncio.sleep(0.3)  # No saturar Railway/Supabase

            except Exception as e:
                print(f"    ✗ Excepción: {e}")
                errores += 1

        print(f"\n{'='*50}")
        print(f"{'[DRY RUN] ' if dry_run else ''}Completado: {ok} OK · {errores} errores")
        if not dry_run and ok > 0:
            print("⚠ Las URLs antiguas ya no son válidas. Recarga el catálogo para ver los cambios.")


if __name__ == "__main__":
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Faltan SUPABASE_URL y SUPABASE_SERVICE_KEY en .env")
        sys.exit(1)

    parser = argparse.ArgumentParser(description="Migrar fotos a WebP con nueva marca de agua")
    parser.add_argument("--dry-run",   action="store_true", help="Solo simula, no modifica nada")
    parser.add_argument("--coche-id",  type=int, default=None, help="Procesar solo un coche (ID)")
    parser.add_argument("--skip-wa",   action="store_true", help="No aplicar marca de agua")
    args = parser.parse_args()

    asyncio.run(migrar(args.dry_run, args.coche_id, args.skip_wa))
