// panel.js — v4 completo con todas las funcionalidades
const API = "https://anantacars-production.up.railway.app";

// ── TOAST ─────────────────────────────────────────────────────────────────────
function toast(msg, error = false) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast${error ? " error" : ""} show`;
  setTimeout(() => el.classList.remove("show"), 3000);
}

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
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, password }),
    });
    if (!resp.ok) { errEl.textContent = "Credenciales incorrectas."; return; }
    setToken((await resp.json()).token);
    mostrarPanel();
  } catch { errEl.textContent = "Error de conexión."; }
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

(async () => {
  const token = getToken();
  if (!token) return;
  try {
    const resp = await fetch(`${API}/api/auth/verificar?token=${token}`);
    if (resp.ok) mostrarPanel(); else quitarToken();
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
    msgErr.textContent = "❌ Rellena los campos obligatorios: marca, modelo, año, precio, km";
    msgErr.style.display = "block"; return;
  }

  btn.disabled = true; btn.textContent = "Publicando...";

  try {
    const precioAnterior = parseFloat(document.getElementById("n-precio-anterior").value) || null;
    const payload = {
      marca, modelo, anio, precio, km,
      precio_anterior: precioAnterior,
      combustible:     document.getElementById("n-combustible").value,
      caja:            document.getElementById("n-caja").value,
      carroceria:      document.getElementById("n-carroceria").value,
      cv:              parseInt(document.getElementById("n-cv").value) || null,
      color:           document.getElementById("n-color").value.trim() || null,
      descripcion:     document.getElementById("n-descripcion").value.trim() || null,
      notas_internas:  document.getElementById("n-notas").value.trim() || null,
      video_youtube:   document.getElementById("n-video").value.trim() || null,
    };

    const respCoche = await fetch(`${API}/api/coches`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify(payload),
    });
    if (!respCoche.ok) throw new Error("Error creando coche");
    const coche = await respCoche.json();

    const archivos = document.getElementById("n-fotos").files;
    if (archivos.length > 0) {
      btn.textContent = `Subiendo ${archivos.length} foto(s)...`;
      const formData = new FormData();
      for (const f of archivos) formData.append("fotos", f);
      await fetch(`${API}/api/fotos/subir/${coche.id}?redimensionar=true&marca_agua=true`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${getToken()}` },
        body: formData,
      });
    }

    ["n-marca","n-modelo","n-anio","n-precio","n-precio-anterior","n-km","n-cv","n-color","n-descripcion","n-notas","n-video"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    document.getElementById("n-fotos").value = "";
    msgOk.style.display = "block";
    toast("✅ Vehículo publicado");
    await cargarListaCoches();
  } catch {
    msgErr.textContent = "❌ Error al publicar. Comprueba la conexión.";
    msgErr.style.display = "block";
  } finally {
    btn.disabled = false; btn.textContent = "Publicar vehículo";
  }
}


// ── LISTA ─────────────────────────────────────────────────────────────────────
function formatPrecio(n) {
  return new Intl.NumberFormat("es-ES", { style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(n);
}

async function cargarListaCoches() {
  const lista  = document.getElementById("lista-coches");
  const orden  = document.getElementById("orden-lista")?.value || "creado_at.desc";
  const estado = document.getElementById("filtro-estado-lista")?.value || "";
  lista.innerHTML = "Cargando...";

  try {
    const params = new URLSearchParams({ orden });
    if (estado) params.set("estado", estado);
    const resp   = await fetch(`${API}/api/coches?${params}`, { headers: authHeaders() });
    const coches = await resp.json();

    if (!coches.length) {
      lista.innerHTML = `<p style="color:var(--gris-texto);padding:20px 0">No hay coches con esos filtros.</p>`;
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

  const precioHTML = c.precio_anterior
    ? `${formatPrecio(c.precio)} <small style="text-decoration:line-through;color:var(--gris-texto);font-size:0.75em">${formatPrecio(c.precio_anterior)}</small>`
    : formatPrecio(c.precio);

  return `
    <div class="coche-item" id="item-${c.id}">
      <div class="coche-thumb">${c.foto_portada ? `<img src="${c.foto_portada}" alt=""/>` : "🚗"}</div>
      <div class="coche-info">
        <div class="coche-nombre">${c.marca} ${c.modelo} ${c.anio}${c.destacado ? " ⭐" : ""}</div>
        <div class="coche-meta">${new Intl.NumberFormat("es-ES").format(c.km)} km · ${c.combustible} · <strong style="color:var(--blanco)">${c.estado.toUpperCase()}</strong></div>
      </div>
      <div class="coche-precio">${precioHTML}</div>
      <div class="coche-acciones">
        ${estadosBtns}
        <button class="btn-accion" onclick="abrirEditar(${c.id})">✏️ Editar</button>
        <button class="btn-accion" onclick="duplicarCoche(${c.id})">⧉ Duplicar</button>
        <button class="btn-accion btn-accion-rojo" onclick="borrarCoche(${c.id},'${c.marca} ${c.modelo}')">🗑</button>
      </div>
    </div>`;
}

async function cambiarEstado(id, nuevoEstado) {
  try {
    const resp = await fetch(`${API}/api/coches/${id}/estado?estado=${nuevoEstado}`, {
      method: "PATCH", headers: authHeaders(),
    });
    if (resp.ok) { toast(`Estado → ${nuevoEstado}`); await cargarListaCoches(); }
    else toast("Error al cambiar estado", true);
  } catch { toast("Error de conexión", true); }
}

async function duplicarCoche(id) {
  try {
    const resp = await fetch(`${API}/api/coches/${id}/duplicar`, {
      method: "POST", headers: authHeaders(),
    });
    if (resp.ok) { toast("✅ Coche duplicado"); await cargarListaCoches(); }
    else toast("Error al duplicar", true);
  } catch { toast("Error de conexión", true); }
}

async function borrarCoche(id, nombre) {
  if (!confirm(`¿Seguro que quieres eliminar "${nombre}"?`)) return;
  try {
    const resp = await fetch(`${API}/api/coches/${id}`, {
      method: "DELETE", headers: authHeaders(),
    });
    if (resp.ok) { toast("🗑 Eliminado"); await cargarListaCoches(); }
    else toast("Error al eliminar", true);
  } catch { toast("Error de conexión", true); }
}


// ── EDITAR ────────────────────────────────────────────────────────────────────
let cocheEditandoId = null;

async function abrirEditar(id) {
  cocheEditandoId = id;
  try {
    const [respCoche, respFotos] = await Promise.all([
      fetch(`${API}/api/coches/${id}`, { headers: authHeaders() }),
      fetch(`${API}/api/fotos/${id}`,  { headers: authHeaders() }),
    ]);
    const c     = await respCoche.json();
    const fotos = await respFotos.json();

    document.getElementById("e-marca").value           = c.marca || "";
    document.getElementById("e-modelo").value          = c.modelo || "";
    document.getElementById("e-anio").value            = c.anio || "";
    document.getElementById("e-precio").value          = c.precio || "";
    document.getElementById("e-precio-anterior").value = c.precio_anterior || "";
    document.getElementById("e-km").value              = c.km || "";
    document.getElementById("e-combustible").value     = c.combustible || "gasolina";
    document.getElementById("e-caja").value            = c.caja || "manual";
    document.getElementById("e-cv").value              = c.cv || "";
    document.getElementById("e-carroceria").value      = c.carroceria || "sedan";
    document.getElementById("e-color").value           = c.color || "";
    document.getElementById("e-descripcion").value     = c.descripcion || "";
    document.getElementById("e-notas").value           = c.notas_internas || "";
    document.getElementById("e-video").value           = c.video_youtube || "";
    document.getElementById("e-destacado").checked     = c.destacado || false;
    document.getElementById("btn-ver-ficha").href      = `ficha.html?id=${id}`;

    renderFotosEditar(fotos, c.foto_portada);
    ["msg-editar-ok","msg-editar-err","msg-fotos-ok","msg-fotos-err"].forEach(id => {
      document.getElementById(id).style.display = "none";
    });
    document.getElementById("modal-editar").classList.add("activo");
  } catch { toast("Error al cargar el vehículo", true); }
}

function renderFotosEditar(fotos, portadaUrl) {
  const cont = document.getElementById("fotos-actuales");
  if (!fotos.length) {
    cont.innerHTML = `<p style="color:var(--gris-texto);font-size:0.82rem;margin-bottom:10px">Sin fotos todavía.</p>`;
    return;
  }
  cont.innerHTML = fotos.map(f => `
    <div class="foto-item${f.url === portadaUrl ? " portada" : ""}" id="foto-item-${f.id}" draggable="true" data-id="${f.id}">
      <img src="${f.url}" alt="foto"/>
      ${f.url === portadaUrl ? `<span class="badge-portada">★</span>` : ""}
      <div class="foto-overlay">
        ${f.url !== portadaUrl ? `<button class="btn-set-portada" onclick="setPortada(${f.id},'${f.url}')">★ Portada</button>` : ""}
        <button class="btn-del-foto" onclick="eliminarFoto(${f.id})">🗑 Borrar</button>
      </div>
    </div>`).join("");

  // Drag & drop para reordenar
  iniciarDragDrop();
}

function iniciarDragDrop() {
  const grid = document.getElementById("fotos-actuales");
  let dragging = null;

  grid.querySelectorAll(".foto-item").forEach(item => {
    item.addEventListener("dragstart", () => { dragging = item; item.style.opacity = "0.4"; });
    item.addEventListener("dragend",   () => { dragging = null; item.style.opacity = "1"; guardarOrdenFotos(); });
    item.addEventListener("dragover",  e => { e.preventDefault(); });
    item.addEventListener("drop", e => {
      e.preventDefault();
      if (dragging && dragging !== item) {
        const items = [...grid.querySelectorAll(".foto-item")];
        const fromIdx = items.indexOf(dragging);
        const toIdx   = items.indexOf(item);
        if (fromIdx < toIdx) item.after(dragging);
        else item.before(dragging);
      }
    });
  });
}

async function guardarOrdenFotos() {
  const orden = [...document.querySelectorAll(".foto-item")].map(el => parseInt(el.dataset.id));
  try {
    await fetch(`${API}/api/coches/${cocheEditandoId}/orden-fotos`, {
      method: "PATCH", headers: authHeaders(), body: JSON.stringify(orden),
    });
    toast("Orden guardado");
  } catch { toast("Error al guardar orden", true); }
}

function cerrarModal() {
  document.getElementById("modal-editar").classList.remove("activo");
  cocheEditandoId = null;
}

async function guardarEdicion() {
  const msgOk  = document.getElementById("msg-editar-ok");
  const msgErr = document.getElementById("msg-editar-err");
  msgOk.style.display = msgErr.style.display = "none";

  const precioAnterior = parseFloat(document.getElementById("e-precio-anterior").value) || null;

  const payload = {
    marca:           document.getElementById("e-marca").value.trim(),
    modelo:          document.getElementById("e-modelo").value.trim(),
    anio:            parseInt(document.getElementById("e-anio").value),
    precio:          parseFloat(document.getElementById("e-precio").value),
    precio_anterior: precioAnterior,
    km:              parseInt(document.getElementById("e-km").value),
    combustible:     document.getElementById("e-combustible").value,
    caja:            document.getElementById("e-caja").value,
    cv:              parseInt(document.getElementById("e-cv").value) || null,
    carroceria:      document.getElementById("e-carroceria").value,
    color:           document.getElementById("e-color").value.trim() || null,
    descripcion:     document.getElementById("e-descripcion").value.trim() || null,
    notas_internas:  document.getElementById("e-notas").value.trim() || null,
    video_youtube:   document.getElementById("e-video").value.trim() || null,
    destacado:       document.getElementById("e-destacado").checked,
  };

  try {
    const resp = await fetch(`${API}/api/coches/${cocheEditandoId}`, {
      method: "PATCH", headers: authHeaders(), body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error();
    msgOk.style.display = "block";
    toast("✅ Cambios guardados");
    await cargarListaCoches();
    setTimeout(() => cerrarModal(), 1500);
  } catch {
    msgErr.style.display = "block";
    toast("Error al guardar", true);
  }
}


// ── FOTOS EN EDITAR ───────────────────────────────────────────────────────────
async function subirFotosEditar() {
  const input  = document.getElementById("e-fotos-nuevas");
  const btn    = document.getElementById("btn-subir-fotos");
  const msgOk  = document.getElementById("msg-fotos-ok");
  const msgErr = document.getElementById("msg-fotos-err");
  msgOk.style.display = msgErr.style.display = "none";
  if (!input.files.length) return;

  const redimensionar = document.getElementById("opt-redimensionar").checked;
  const marcaAgua     = document.getElementById("opt-marcaagua").checked;

  btn.disabled = true; btn.textContent = "Subiendo...";

  try {
    const formData = new FormData();
    for (const f of input.files) formData.append("fotos", f);

    const resp = await fetch(
      `${API}/api/fotos/subir/${cocheEditandoId}?redimensionar=${redimensionar}&marca_agua=${marcaAgua}`,
      { method: "POST", headers: { "Authorization": `Bearer ${getToken()}` }, body: formData }
    );
    if (!resp.ok) throw new Error();

    input.value = "";
    msgOk.style.display = "block";
    toast("✅ Fotos subidas");

    const [respCoche, respFotos] = await Promise.all([
      fetch(`${API}/api/coches/${cocheEditandoId}`, { headers: authHeaders() }),
      fetch(`${API}/api/fotos/${cocheEditandoId}`,  { headers: authHeaders() }),
    ]);
    renderFotosEditar(await respFotos.json(), (await respCoche.json()).foto_portada);
    await cargarListaCoches();
  } catch {
    msgErr.style.display = "block";
    toast("Error al subir fotos", true);
  } finally {
    btn.disabled = false; btn.textContent = "Subir fotos";
  }
}

async function eliminarFoto(fotoId) {
  if (!confirm("¿Eliminar esta foto?")) return;
  try {
    const resp = await fetch(`${API}/api/fotos/${fotoId}`, {
      method: "DELETE", headers: authHeaders(),
    });
    if (resp.ok) {
      document.getElementById(`foto-item-${fotoId}`)?.remove();
      toast("Foto eliminada");
      await cargarListaCoches();
    } else toast("Error al eliminar foto", true);
  } catch { toast("Error de conexión", true); }
}

async function setPortada(fotoId, url) {
  try {
    const resp = await fetch(`${API}/api/coches/${cocheEditandoId}`, {
      method: "PATCH", headers: authHeaders(),
      body: JSON.stringify({ foto_portada: url }),
    });
    if (!resp.ok) throw new Error();
    toast("✅ Portada actualizada");
    const [respCoche, respFotos] = await Promise.all([
      fetch(`${API}/api/coches/${cocheEditandoId}`, { headers: authHeaders() }),
      fetch(`${API}/api/fotos/${cocheEditandoId}`,  { headers: authHeaders() }),
    ]);
    renderFotosEditar(await respFotos.json(), (await respCoche.json()).foto_portada);
    await cargarListaCoches();
  } catch { toast("Error al cambiar portada", true); }
}

// Cerrar modal al hacer click fuera
document.getElementById("modal-editar").addEventListener("click", function(e) {
  if (e.target === this) cerrarModal();
});
