"""
config.py — Configuración centralizada del proyecto
Todas las variables de entorno se leen aquí y se usan desde aquí.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# --- SUPABASE ---
SUPABASE_URL        = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY   = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Cabeceras base para llamadas a Supabase REST API con service key (operaciones admin)
HEADERS_SERVICE = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
}

# --- AUTH ---
SECRET_KEY      = os.getenv("SECRET_KEY", "cambia-esto-en-produccion")
ALGORITHM       = "HS256"
TOKEN_EXPIRE_HORAS = 24

# --- NEGOCIO ---
WHATSAPP_NUMERO  = os.getenv("WHATSAPP_NUMERO", "34600000000")
NOMBRE_NEGOCIO   = os.getenv("NOMBRE_NEGOCIO", "Ananta Cars")

# --- FOTOS ---
MAX_FOTO_MB      = 8           # tamaño máximo por foto en MB
CALIDAD_COMPRESION = 82        # calidad JPEG tras comprimir (0-100)
ANCHO_MAX_FOTO   = 1400        # píxeles, redimensiona si es mayor
BUCKET_FOTOS     = "anantacars-fotos"

# --- ENTORNO ---
ENTORNO = os.getenv("ENTORNO", "desarrollo")
DEBUG   = ENTORNO == "desarrollo"

# CORS — en producción cambiar por el dominio real
ORIGINS_PERMITIDOS = ["*"] if DEBUG else [
    "https://tudominio.com",
    "https://www.tudominio.com",
]

# --- IA ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL   = "gemini-2.5-flash"
