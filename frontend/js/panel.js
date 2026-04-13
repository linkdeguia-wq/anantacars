// panel.js — Lógica del panel privado de gestión
const API = "https://anantacars-production.up.railway.app";

// ── AUTH ──────────────────────────────────────────────────────────────────────

function getToken() { return localStorage.getItem("ac_token"); }
function setToken(t) { localStorage.setItem("ac_token", t); }
function quitarToken() { localStorage.removeItem("ac_token"); }

function authHeaders() {
  return { "Authorization": `Bearer ${getToken()}`, "Content-Type": "application/json" };
}

async function login() {
  const usuario  = document.getElementById("l-usuario").value.trim();
  const password = document.getElementById("l-pass").value;
  const errEl    = document.getElementById("login-error");
  errEl.textContent = "";

  if (!usuario || !password) { errEl.textContent = "Rellena usuario y contraseña."; return; }

  try {
    const resp = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, password }),
    });

    if (!resp.ok) { errEl.textContent = "Credenciales incorrectas."; return; }

    const data = await resp.json();
    setToken(data.token);
    mostrarPanel();

  } catch {
    errEl.textContent = "Error de conexión.";
  }
}

function cerrarSesion() {
  quitarToken();
  document.getElementById("pantalla-panel").style.display = "none";
  document.getElementById("pantalla-login").style.display = "flex";
}

async function mostrarPanel() {
  document.getElementById("pantalla-login").style.display = "none";
  document.getElementById("pantalla-panel").style.display = "block";
  await cargarListaCoches();
}

// Verificar token al cargar
(async () => {
  const token = getToken();
  if (!token) return;
  try {
    const resp = await fetch(`${API}/api/auth/verificar?token=${token}`);
    if (resp.ok) mostrarPanel();
    else quitarToken();
  } catch { quitarToken(); }
})();

// Enter en login
document.getElementById("l-pass")?.addEventListener("keydown", e => e.key === "Enter" && login());


// ── CREAR COCHE ───────────────────────────────────────────────────────────────

async function crearCoche() {
  const btn   = document.getElementById("btn-crear");
  const msgOk = document.getElementById("msg-crear-ok");
  const msgErr = document.getElementById("msg-crear-err");
  msgOk.style.display = msgErr.style.display = "none";

  const marca  = document.getElementById("n-marca").value.trim();
  const modelo = document.getElementById("n-modelo").value.trim();
  const anio   = parseInt(document.getElementById("n-anio").value);
  const precio = parseFloat(document.getElementById("n-precio").value);
  const km     = parseInt(document.getElementById("n-km").value);

  if (!marca || !modelo || !anio || !precio || !km) {
    msgErr.textContent = "❌ Rellena los campos obligatorios (marca, modelo, año, precio, km)";
    msgErr.style.display = "block"; return;
  }

  btn.disabled = true; btn.textContent = "Publicando...";

  try {
    // 1. Crear el coche
    const payload = {
      marca, modelo, anio, precio, km,
      combustible: document.getElementById("n-combustible").value,
      caja: document.getElementById("n-caja").value,
      carroceria: document.getElementById("n-carroceria").value,
      cv: parseInt(document.getElementById("n-cv").value) || null,
      color: document.getElementById("n-color").value.trim() || null,
      descripcion: document.getElementById("n-descripcion").value.trim() || null,
      video_youtube: document.getElementById("n-video").value.trim() || null,
    };

    const respCoche = await fetch(`${API}/api/coches`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    if (!respCoche.ok) throw new Error("Error creando coche");
    const coche = await respCoche.json();

    // 2. Subir fotos si hay
    const archivos = document.getElementById("n-fotos").files;
    if (archivos.length > 0) {
      btn.textContent = `Subiendo fotos (${archivos.length})...`;
      const formData = new FormData();
      for (const f of archivos) formData.append("fotos", f);

      await fetch(`${API}/api/fotos/subir/${coche.id}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${getToken()}` },
        body: formData,
      });
    }

    // Limpiar formulario
    ["n-marca","n-modelo","n-anio","n-precio","n-km","n-cv","n-color","n-descripcion","n-video"].forEach(id => {
      document.getElementById(id).value = "";
    });
    document.getElementById("n-fotos").value = "";

    msgOk.style.display = "block";
    await cargarListaCoches();

  } catch (err) {
    msgErr.textContent = "❌ Error al publicar. Comprueba la conexión.";
    msgErr.style.display = "block";
    console.error(err);
  } finally {
    btn.disabled = false; btn.textContent = "Publicar vehículo";
  }
}


// ── LISTA DE COCHES ───────────────────────────────────────────────────────────

function formatPrecio(n) {
  return new Intl.NumberFormat("es-ES", { style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(n);
}

async function cargarListaCoches() {
  const lista = document.getElementById("lista-coches");
  lista.innerHTML = "Cargando...";

  try {
    const resp = await fetch(`${API}/api/coches?estado=`, {
      headers: authHeaders(),
    });
    const coches = await resp.json();

    if (!coches.length) {
      lista.innerHTML = `<p style="color:var(--gris-texto);padding:20px 0">No hay coches en el catálogo todavía.</p>`;
      return;
    }

    lista.innerHTML = `<div class="lista-coches">${coches.map(renderItem).join("")}</div>`;

  } catch {
    lista.innerHTML = `<p style="color:#ff6b6b">Error al cargar la lista.</p>`;
  }
}

function renderItem(c) {
  const estadoActual = c.estado;
  const estadosBtns = ["disponible","reservado","vendido"].map(e => {
    if (e === estadoActual) return "";
    const labels = { disponible:"✅ Disponible", reservado:"⏳ Reservar", vendido:"🔴 Vendido" };
    return `<button class="btn-estado btn-${e}" onclick="cambiarEstado(${c.id},'${e}')">${labels[e]}</button>`;
  }).join("");

  return `
    <div class="coche-item" id="item-${c.id}">
      <div class="coche-thumb">
        ${c.foto_portada ? `<img src="${c.foto_portada}" alt=""/>` : "🚗"}
      </div>
      <div class="coche-info">
        <div class="coche-nombre">${c.marca} ${c.modelo} ${c.anio}</div>
        <div class="coche-meta">${new Intl.NumberFormat("es-ES").format(c.km)} km · ${c.combustible} · ${c.estado.toUpperCase()}</div>
      </div>
      <div class="coche-precio">${formatPrecio(c.precio)}</div>
      <div class="coche-acciones">
        ${estadosBtns}
        <button class="btn-borrar" onclick="borrarCoche(${c.id},'${c.marca} ${c.modelo}')">🗑 Borrar</button>
      </div>
    </div>`;
}

async function cambiarEstado(id, nuevoEstado) {
  try {
    const resp = await fetch(`${API}/api/coches/${id}/estado?estado=${nuevoEstado}`, {
      method: "PATCH",
      headers: authHeaders(),
    });
    if (resp.ok) await cargarListaCoches();
    else alert("Error al cambiar estado");
  } catch { alert("Error de conexión"); }
}

async function borrarCoche(id, nombre) {
  if (!confirm(`¿Seguro que quieres eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return;
  try {
    const resp = await fetch(`${API}/api/coches/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (resp.ok) await cargarListaCoches();
    else alert("Error al eliminar");
  } catch { alert("Error de conexión"); }
}
