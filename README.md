# Ananta Cars Web 🚗

Web de compraventa de coches de ocasión.  
Stack: FastAPI (Railway) + HTML/JS (Vercel) + Supabase + GitHub

---

## Estructura del proyecto

```
anantacars/
├── .gitignore
├── .env.ejemplo
├── README.md
├── backend/
│   ├── main.py             ← FastAPI punto de entrada
│   ├── config.py           ← configuración centralizada
│   ├── requirements.txt
│   ├── .env                ← TUS CLAVES (nunca sube a GitHub)
│   └── rutas/
│       ├── __init__.py
│       ├── coches.py       ← CRUD de coches
│       ├── fotos.py        ← subida y procesado de fotos
│       └── auth.py         ← login del panel admin
└── frontend/
    ├── index.html          ← catálogo público
    ├── ficha.html          ← ficha de un coche
    ├── panel.html          ← panel privado de gestión
    └── js/
        ├── catalogo.js
        ├── ficha.js
        └── panel.js
```

---

## Arrancar en local

### 1. Abrir terminal en VS Code
`Ctrl + ñ` o menú Terminal → New Terminal

### 2. Ir a la carpeta del proyecto
```bash
cd anantacars
```

### 3. Crear entorno virtual Python
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
```

### 4. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 5. Crear tu archivo .env
```bash
copy .env.ejemplo .env      # Windows
# cp .env.ejemplo .env      # Mac/Linux
```
Abre `backend/.env` y rellena tus claves de Supabase.

### 6. Arrancar el servidor
```bash
uvicorn main:app --reload --port 8000
```

### 7. Comprobar que funciona
Abre Chrome y ve a: http://localhost:8000

Deberías ver:
```json
{
  "estado": "online",
  "app": "Ananta Cars",
  "version": "1.0.0",
  "entorno": "desarrollo"
}
```

### 8. Ver documentación de la API
http://localhost:8000/docs

---

## Tablas en Supabase

Ejecuta este SQL en el editor de Supabase (SQL Editor):

```sql
-- Tabla principal de coches
create table coches (
  id              bigserial primary key,
  marca           text not null,
  modelo          text not null,
  anio            int not null,
  precio          numeric not null,
  km              int not null,
  combustible     text not null default 'gasolina',
  caja            text not null default 'manual',
  cv              int,
  carroceria      text not null default 'sedan',
  color           text,
  descripcion     text,
  video_youtube   text,
  foto_portada    text,
  estado          text not null default 'disponible',
  destacado       boolean not null default false,
  creado_at       timestamptz not null default now(),
  actualizado_at  timestamptz not null default now()
);

-- Tabla de fotos de cada coche
create table fotos_coches (
  id        bigserial primary key,
  coche_id  bigint references coches(id) on delete cascade,
  url       text not null,
  orden     int not null default 1,
  creado_at timestamptz not null default now()
);

-- Bucket en Storage para las fotos
-- (crear manualmente en Supabase > Storage > New bucket > coches-fotos > Public)
```

---

## Variables de entorno (.env)

```
SUPABASE_URL=https://tuproyecto.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
SECRET_KEY=clave-larga-y-aleatoria
ADMIN_USUARIO=admin
ADMIN_PASSWORD=tupassword
NOMBRE_NEGOCIO=Tu Nombre Motor
WHATSAPP_NUMERO=34600000000
ENTORNO=desarrollo
```

---

## Despliegue en producción

### Backend → Railway
1. Sube el repo a GitHub
2. En Railway: New Project → Deploy from GitHub
3. Selecciona la carpeta `backend` como root
4. Añade las variables de entorno en Railway (las mismas del .env)
5. Railway genera una URL tipo `https://xxx.railway.app`
6. Cambia `ENTORNO=produccion`

### Frontend → Vercel
1. En Vercel: New Project → importa el repo de GitHub
2. Selecciona la carpeta `frontend` como root
3. Antes de desplegar, edita `js/catalogo.js`, `js/ficha.js` y `js/panel.js`
   y cambia `const API = "..."` por la URL de Railway
4. Vercel genera una URL tipo `https://xxx.vercel.app`
5. En Dondominio: apunta el dominio a Vercel (añade los DNS records de Vercel)

---

## Comandos Git del día a día

```bash
# Cuando algo funciona y quieres guardarlo
git add .
git commit -m "descripcion de lo que hiciste"
git push

# Ver estado de cambios
git status

# Ver historial
git log --oneline
```

---

## Generar hash de contraseña admin

```bash
cd backend
python -c "from passlib.context import CryptContext; c=CryptContext(schemes=['bcrypt']); print(c.hash('tupassword'))"
```
Copia el resultado y ponlo en `.env` como `ADMIN_PASSWORD_HASH=...`

---

## Próximos pasos planificados
- [ ] Publicación automática en Instagram/Facebook (Meta Business API)
- [ ] Alertas WhatsApp a interesados (Twilio)
- [ ] Automatizaciones Make.com
- [ ] Calculadora de financiación
- [ ] Comparador de coches
- [ ] SEO: sitemap.xml automático
