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

document.getElementById("l-pass")?.addEventListener("keydown", e => e.key === "Enter" && login());


// ── CREAR COCHE ───────────────────────────────────────────────────────────────

async function crearCoche() {
  const btn    = document.getElementById("btn-crear");
  const msgOk  = document.getElementById("msg-crear-ok");
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
    const resp = await fetch(`${API}/api/coches`, { headers: authHeaders() });
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
  const estadosBtns = ["disponible","reservado","vendido"].map(e => {
    if (e === c.estado) return "";
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
        <div class="coche-meta">${new Intl.NumberFormat("es-ES").format(c.km)} km · ${c.combustible} · ${c.estado.toUpperCase()}${c.destacado ? ' · ⭐' : ''}</div>
      </div>
      <div class="coche-precio">${formatPrecio(c.precio)}</div>
      <div class="coche-acciones">
        ${estadosBtns}
        <button class="btn-editar" onclick="abrirEditar(${c.id})">✏️ Editar</button>
        <button class="btn-borrar" onclick="borrarCoche(${c.id},'${c.marca} ${c.modelo}')">🗑 Borrar</button>
      </div>
    </div>`;
}

async function cambiarEstado(id, nuevoEstado) {
  try {
    const resp = await fetch(`${API}/api/coches/${id}/estado?estado=${nuevoEstado}`, {
      method: "PATCH", headers: authHeaders(),
    });
    if (resp.ok) await cargarListaCoches();
    else alert("Error al cambiar estado");
  } catch { alert("Error de conexión"); }
}

async function borrarCoche(id, nombre) {
  if (!confirm(`¿Seguro que quieres eliminar "${nombre}"?`)) return;
  try {
    const resp = await fetch(`${API}/api/coches/${id}`, {
      method: "DELETE", headers: authHeaders(),
    });
    if (resp.ok) await cargarListaCoches();
    else alert("Error al eliminar");
  } catch { alert("Error de conexión"); }
}


// ── EDITAR COCHE ──────────────────────────────────────────────────────────────

let cocheEditandoId = null;

async function abrirEditar(id) {
  cocheEditandoId = id;

  try {
    const resp = await fetch(`${API}/api/coches/${id}`, { headers: authHeaders() });
    const c = await resp.json();

    document.getElementById("e-marca").value       = c.marca || "";
    document.getElementById("e-modelo").value      = c.modelo || "";
    document.getElementById("e-anio").value        = c.anio || "";
    document.getElementById("e-precio").value      = c.precio || "";
    document.getElementById("e-km").value          = c.km || "";
    document.getElementById("e-combustible").value = c.combustible || "gasolina";
    document.getElementById("e-caja").value        = c.caja || "manual";
    document.getElementById("e-cv").value          = c.cv || "";
    document.getElementById("e-carroceria").value  = c.carroceria || "sedan";
    document.getElementById("e-color").value       = c.color || "";
    document.getElementById("e-descripcion").value = c.descripcion || "";
    document.getElementById("e-video").value       = c.video_youtube || "";
    document.getElementById("e-destacado").checked = c.destacado || false;

    document.getElementById("msg-editar-ok").style.display = "none";
    document.getElementById("msg-editar-err").style.display = "none";
    document.getElementById("modal-editar").classList.add("activo");

  } catch {
    alert("Error al cargar los datos del vehículo");
  }
}

function cerrarModal() {
  document.getElementById("modal-editar").classList.remove("activo");
  cocheEditandoId = null;
}

async function guardarEdicion() {
  const msgOk  = document.getElementById("msg-editar-ok");
  const msgErr = document.getElementById("msg-editar-err");
  msgOk.style.display = msgErr.style.display = "none";

  const payload = {
    marca:         document.getElementById("e-marca").value.trim(),
    modelo:        document.getElementById("e-modelo").value.trim(),
    anio:          parseInt(document.getElementById("e-anio").value),
    precio:        parseFloat(document.getElementById("e-precio").value),
    km:            parseInt(document.getElementById("e-km").value),
    combustible:   document.getElementById("e-combustible").value,
    caja:          document.getElementById("e-caja").value,
    cv:            parseInt(document.getElementById("e-cv").value) || null,
    carroceria:    document.getElementById("e-carroceria").value,
    color:         document.getElementById("e-color").value.trim() || null,
    descripcion:   document.getElementById("e-descripcion").value.trim() || null,
    video_youtube: document.getElementById("e-video").value.trim() || null,
    destacado:     document.getElementById("e-destacado").checked,
  };

  try {
    const resp = await fetch(`${API}/api/coches/${cocheEditandoId}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    if (!resp.ok) throw new Error("Error al guardar");

    msgOk.style.display = "block";
    await cargarListaCoches();

    setTimeout(() => cerrarModal(), 1200);

  } catch {
    msgErr.style.display = "block";
  }
}

// Cerrar modal al hacer click fuera
document.getElementById("modal-editar").addEventListener("click", function(e) {
  if (e.target === this) cerrarModal();
});
