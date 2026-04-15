
// ── IA — ESCANEAR COCHE ───────────────────────────────────────────────────────
async function escanearCoche() {
  const input = document.getElementById("ia-foto-scan");
  const msg   = document.getElementById("scan-msg");
  const btn   = document.getElementById("btn-scan");
  if (!input?.files[0]) { msg.textContent = "Selecciona una foto primero"; msg.style.color = "#ff8f8f"; return; }

  btn.disabled = true; btn.textContent = "Analizando...";
  msg.textContent = "⏳ Gemini analizando la imagen..."; msg.style.color = "var(--gris-texto)";

  try {
    const formData = new FormData();
    formData.append("foto", input.files[0]);
    const resp = await fetch(`${API}/api/ia/escanear-coche`, {
      method: "POST", headers: { "Authorization": `Bearer ${getToken()}` }, body: formData,
    });
    const data = await resp.json();
    if (!data.ok) throw new Error(data.detail || "Error");

    const d = data.datos;
    if (d.marca)      { const el = document.getElementById("n-marca");      if (el) el.value = d.marca; }
    if (d.modelo)     { const el = document.getElementById("n-modelo");     if (el) el.value = d.modelo; }
    if (d.anio)       { const el = document.getElementById("n-anio");       if (el) el.value = d.anio; }
    if (d.color)      { const el = document.getElementById("n-color");      if (el) el.value = d.color; }
    if (d.combustible){ const el = document.getElementById("n-combustible"); if (el) el.value = d.combustible; }
    if (d.carroceria) { const el = document.getElementById("n-carroceria"); if (el) el.value = d.carroceria; }
    if (d.cv)         { const el = document.getElementById("n-cv");         if (el) el.value = d.cv; }

    const rellenos = Object.values(d).filter(v => v !== null).length;
    msg.textContent = `✅ ${rellenos} campos rellenados automáticamente`;
    msg.style.color = "#7fffaa";
  } catch(e) {
    msg.textContent = "❌ Error al analizar: " + e.message;
    msg.style.color = "#ff8f8f";
  } finally {
    btn.disabled = false; btn.textContent = "🔍 Escanear";
  }
}

async function escanearCocheEditar() {
  const input = document.getElementById("e-ia-foto-scan");
  const msg   = document.getElementById("e-scan-msg");
  if (!input?.files[0]) { msg.textContent = "Selecciona una foto"; msg.style.color = "#ff8f8f"; return; }

  msg.textContent = "⏳ Analizando..."; msg.style.color = "var(--gris-texto)";
  try {
    const formData = new FormData();
    formData.append("foto", input.files[0]);
    const resp = await fetch(`${API}/api/ia/escanear-coche`, {
      method: "POST", headers: { "Authorization": `Bearer ${getToken()}` }, body: formData,
    });
    const data = await resp.json();
    if (!data.ok) throw new Error();
    const d = data.datos;
    if (d.marca)      document.getElementById("e-marca").value      = d.marca;
    if (d.modelo)     document.getElementById("e-modelo").value     = d.modelo;
    if (d.anio)       document.getElementById("e-anio").value       = d.anio;
    if (d.color)      document.getElementById("e-color").value      = d.color;
    if (d.combustible)document.getElementById("e-combustible").value= d.combustible;
    if (d.carroceria) document.getElementById("e-carroceria").value = d.carroceria;
    if (d.cv)         document.getElementById("e-cv").value         = d.cv;
    msg.textContent = "✅ Campos rellenados"; msg.style.color = "#7fffaa";
  } catch {
    msg.textContent = "❌ Error al analizar"; msg.style.color = "#ff8f8f";
  }
}

// ── IA — GENERAR DESCRIPCIÓN ──────────────────────────────────────────────────
async function generarDescripcion() {
  const msg = document.getElementById("desc-msg");
  const btn = document.getElementById("btn-desc");

  const payload = {
    marca:       document.getElementById("n-marca")?.value.trim(),
    modelo:      document.getElementById("n-modelo")?.value.trim(),
    anio:        parseInt(document.getElementById("n-anio")?.value) || new Date().getFullYear(),
    km:          parseInt(document.getElementById("n-km")?.value) || 0,
    combustible: document.getElementById("n-combustible")?.value || "gasolina",
    caja:        document.getElementById("n-caja")?.value || "manual",
    cv:          parseInt(document.getElementById("n-cv")?.value) || null,
    color:       document.getElementById("n-color")?.value.trim() || null,
    carroceria:  document.getElementById("n-carroceria")?.value || null,
    precio:      parseFloat(document.getElementById("n-precio")?.value) || null,
    extras:      document.getElementById("ia-extras")?.value.trim() || null,
  };

  if (!payload.marca || !payload.modelo) {
    msg.textContent = "Rellena al menos marca y modelo primero"; msg.style.color = "#ff8f8f"; return;
  }

  btn.disabled = true; btn.textContent = "Generando...";
  msg.textContent = "✨ Generando descripción profesional..."; msg.style.color = "var(--gris-texto)";

  try {
    const resp = await fetch(`${API}/api/ia/generar-descripcion`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (!data.ok) throw new Error(data.detail || "Error");
    const ta = document.getElementById("n-descripcion");
    if (ta) ta.value = data.descripcion;
    msg.textContent = "✅ Descripción generada — revísala y edítala si quieres";
    msg.style.color = "#7fffaa";
  } catch(e) {
    msg.textContent = "❌ Error: " + e.message; msg.style.color = "#ff8f8f";
  } finally {
    btn.disabled = false; btn.textContent = "✨ Generar descripción";
  }
}

async function generarDescripcionEditar() {
  const msg = document.getElementById("e-desc-msg");
  const payload = {
    marca:       document.getElementById("e-marca")?.value.trim(),
    modelo:      document.getElementById("e-modelo")?.value.trim(),
    anio:        parseInt(document.getElementById("e-anio")?.value) || new Date().getFullYear(),
    km:          parseInt(document.getElementById("e-km")?.value) || 0,
    combustible: document.getElementById("e-combustible")?.value || "gasolina",
    caja:        document.getElementById("e-caja")?.value || "manual",
    cv:          parseInt(document.getElementById("e-cv")?.value) || null,
    color:       document.getElementById("e-color")?.value.trim() || null,
    carroceria:  document.getElementById("e-carroceria")?.value || null,
    precio:      parseFloat(document.getElementById("e-precio")?.value) || null,
    extras:      document.getElementById("e-ia-extras")?.value.trim() || null,
  };
  if (!payload.marca || !payload.modelo) {
    msg.textContent = "Rellena marca y modelo"; msg.style.color = "#ff8f8f"; return;
  }
  msg.textContent = "✨ Generando..."; msg.style.color = "var(--gris-texto)";
  try {
    const resp = await fetch(`${API}/api/ia/generar-descripcion`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (!data.ok) throw new Error();
    document.getElementById("e-descripcion").value = data.descripcion;
    msg.textContent = "✅ Listo — edítala si quieres"; msg.style.color = "#7fffaa";
  } catch {
    msg.textContent = "❌ Error al generar"; msg.style.color = "#ff8f8f";
  }
}

// panel.js — v5 completo con dashboard, config, historial, exportar PDF
const API = "https://anantacars-production.up.railway.app";

// ── TOAST ─────────────────────────────────────────────────────────────────────
function toast(msg, error = false) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast${error ? " error" : ""} show`;
  setTimeout(() => el.classList.remove("show"), 3000);
}

// ── TABS ──────────────────────────────────────────────────────────────────────
function cambiarTab(tab) {
  document.querySelectorAll(".tab-btn").forEach((b,i) => {
    const tabs = ["dashboard","catalogo","anadir","config"];
    b.classList.toggle("activo", tabs[i] === tab);
  });
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("activo"));
  document.getElementById(`tab-${tab}`)?.classList.add("activo");
  if (tab === "dashboard") cargarStats();
  if (tab === "catalogo")  cargarListaCoches();
  if (tab === "config")    cargarConfig();
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem("ac_token"); }
function setToken(t) { localStorage.setItem("ac_token", t); }
function quitarToken() { localStorage.removeItem("ac_token"); }
function authHeaders() { return { "Authorization": `Bearer ${getToken()}`, "Content-Type": "application/json" }; }

async function login() {
  const usuario  = document.getElementById("l-usuario").value.trim();
  const password = document.getElementById("l-pass").value;
  const errEl    = document.getElementById("login-error");
  errEl.textContent = "";
  if (!usuario || !password) { errEl.textContent = "Rellena usuario y contraseña."; return; }
  try {
    const resp = await fetch(`${API}/api/auth/login`, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({usuario, password}),
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
  cargarStats();
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


// ── DASHBOARD ─────────────────────────────────────────────────────────────────
async function cargarStats() {
  try {
    const resp = await fetch(`${API}/api/coches/stats`, {headers: authHeaders()});
    const s = await resp.json();
    document.getElementById("st-total").textContent       = s.total || 0;
    document.getElementById("st-disponibles").textContent = s.disponibles || 0;
    document.getElementById("st-reservados").textContent  = s.reservados || 0;
    document.getElementById("st-vendidos").textContent    = s.vendidos || 0;
    document.getElementById("st-precio").textContent      = s.precio_medio ? `${s.precio_medio.toLocaleString("es-ES")}€` : "—";
    document.getElementById("st-visitas").textContent     = s.visitas_totales || 0;
  } catch { /* silencioso */ }
}


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
    const payload = {
      marca, modelo, anio, precio, km,
      precio_anterior:  parseFloat(document.getElementById("n-precio-anterior").value) || null,
      combustible:      document.getElementById("n-combustible").value,
      caja:             document.getElementById("n-caja").value,
      carroceria:       document.getElementById("n-carroceria").value,
      cv:               parseInt(document.getElementById("n-cv").value) || null,
      color:            document.getElementById("n-color").value.trim() || null,
      descripcion:      document.getElementById("n-descripcion").value.trim() || null,
      notas_internas:   document.getElementById("n-notas").value.trim() || null,
      video_youtube:    document.getElementById("n-video").value.trim() || null,
      historial_km:     document.getElementById("n-historial-km")?.value.trim() || null,
      etiqueta_dgt:     document.getElementById("n-etiqueta")?.value || null,
    };

    const respCoche = await fetch(`${API}/api/coches`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify(payload),
    });
    if (!respCoche.ok) throw new Error();
    const coche = await respCoche.json();

    const archivos = document.getElementById("n-fotos").files;
    if (archivos.length > 0) {
      btn.textContent = `Subiendo ${archivos.length} foto(s)...`;
      const formData = new FormData();
      for (const f of archivos) formData.append("fotos", f);
      await fetch(`${API}/api/fotos/subir/${coche.id}?redimensionar=true&marca_agua=true`, {
        method: "POST", headers: {"Authorization": `Bearer ${getToken()}`}, body: formData,
      });
    }

    ["n-marca","n-modelo","n-anio","n-precio","n-precio-anterior","n-km","n-cv","n-color","n-notas","n-video"].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = "";
    });
    document.getElementById("n-descripcion").value = "";
    document.getElementById("n-fotos").value = "";
    msgOk.style.display = "block";
    toast("✅ Vehículo publicado");
    cambiarTab("catalogo");
  } catch {
    msgErr.textContent = "❌ Error al publicar. Comprueba la conexión.";
    msgErr.style.display = "block";
  } finally {
    btn.disabled = false; btn.textContent = "Publicar vehículo";
  }
}


// ── LISTA ─────────────────────────────────────────────────────────────────────
function formatPrecio(n) { return new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n); }

async function cargarListaCoches() {
  const lista  = document.getElementById("lista-coches");
  const orden  = document.getElementById("orden-lista")?.value || "creado_at.desc";
  const estado = document.getElementById("filtro-estado-lista")?.value || "";
  lista.innerHTML = "Cargando...";

  try {
    const params = new URLSearchParams({orden, por_pagina: 50});
    if (estado) params.set("estado", estado);
    const resp   = await fetch(`${API}/api/coches?${params}`, {headers: authHeaders()});
    const data   = await resp.json();
    const coches = data.coches || [];

    if (!coches.length) {
      lista.innerHTML = `<p style="color:var(--gris-texto);padding:20px 0">No hay coches con esos filtros.</p>`;
      return;
    }
    lista.innerHTML = `<div class="lista-coches">${coches.map(renderItem).join("")}</div>`;
  } catch {
    lista.innerHTML = `<p style="color:#ff6b6b">Error al cargar.</p>`;
  }
}

function renderItem(c) {
  const estadosBtns = ["disponible","reservado","vendido"].map(e => {
    if (e === c.estado) return "";
    const labels = {disponible:"✅ Disponible", reservado:"⏳ Reservar", vendido:"🔴 Vendido"};
    return `<button class="btn-estado btn-${e}" onclick="cambiarEstado(${c.id},'${e}')">${labels[e]}</button>`;
  }).join("");

  const precioHTML = c.precio_anterior
    ? `${formatPrecio(c.precio)} <small style="text-decoration:line-through;color:var(--gris-texto)">${formatPrecio(c.precio_anterior)}</small>`
    : formatPrecio(c.precio);

  return `
    <div class="coche-item" id="item-${c.id}">
      <div class="coche-thumb">${c.foto_portada ? `<img src="${c.foto_portada}" alt=""/>` : "🚗"}</div>
      <div class="coche-info">
        <div class="coche-nombre">${c.marca} ${c.modelo} ${c.anio}${c.destacado ? " ⭐" : ""}</div>
        <div class="coche-meta">${new Intl.NumberFormat("es-ES").format(c.km)} km · ${c.combustible} · <strong style="color:var(--blanco)">${c.estado.toUpperCase()}</strong>${c.visitas ? ` · 👁 ${c.visitas}` : ""}</div>
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
    const resp = await fetch(`${API}/api/coches/${id}/estado?estado=${nuevoEstado}`, {method:"PATCH", headers:authHeaders()});
    if (resp.ok) { toast(`Estado → ${nuevoEstado}`); await cargarListaCoches(); }
    else toast("Error al cambiar estado", true);
  } catch { toast("Error de conexión", true); }
}

async function duplicarCoche(id) {
  try {
    const resp = await fetch(`${API}/api/coches/${id}/duplicar`, {method:"POST", headers:authHeaders()});
    if (resp.ok) { toast("✅ Coche duplicado"); await cargarListaCoches(); }
    else toast("Error al duplicar", true);
  } catch { toast("Error de conexión", true); }
}

async function borrarCoche(id, nombre) {
  if (!confirm(`¿Seguro que quieres eliminar "${nombre}"?`)) return;
  try {
    const resp = await fetch(`${API}/api/coches/${id}`, {method:"DELETE", headers:authHeaders()});
    if (resp.ok) { toast("🗑 Eliminado"); await cargarListaCoches(); }
    else toast("Error al eliminar", true);
  } catch { toast("Error de conexión", true); }
}


// ── EDITAR ────────────────────────────────────────────────────────────────────
let cocheEditandoId = null;

async function abrirEditar(id) {
  cocheEditandoId = id;
  try {
    const [respCoche, respFotos, respHist] = await Promise.all([
      fetch(`${API}/api/coches/${id}`,           {headers: authHeaders()}),
      fetch(`${API}/api/fotos/${id}`,            {headers: authHeaders()}),
      fetch(`${API}/api/coches/${id}/historial`, {headers: authHeaders()}),
    ]);
    const c     = await respCoche.json();
    const fotos = await respFotos.json();
    const hist  = await respHist.json();

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
    if (document.getElementById("e-historial-km")) document.getElementById("e-historial-km").value = c.historial_km || "";
    document.getElementById("e-destacado").checked     = c.destacado || false;
    if (document.getElementById("e-etiqueta")) document.getElementById("e-etiqueta").value = c.etiqueta_dgt || "";
    document.getElementById("btn-ver-ficha").href      = `/coches/${c.marca}-${c.modelo}-${c.anio}-id${id}`.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");

    renderFotosEditar(fotos, c.foto_portada);
    renderHistorial(hist);

    ["msg-editar-ok","msg-editar-err","msg-fotos-ok","msg-fotos-err"].forEach(i => {
      document.getElementById(i).style.display = "none";
    });
    document.getElementById("modal-editar").classList.add("activo");
  } catch { toast("Error al cargar el vehículo", true); }
}

function renderHistorial(hist) {
  const cont = document.getElementById("historial-lista");
  if (!hist.length) {
    cont.innerHTML = `<p style="color:var(--gris-texto);padding:10px;font-size:0.82rem">Sin cambios registrados</p>`;
    return;
  }
  cont.innerHTML = hist.map(h => {
    const fecha = new Date(h.creado_at).toLocaleDateString("es-ES", {day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"});
    return `<div class="historial-item">
      <div>
        <div class="historial-campo">${h.campo}</div>
        <div class="historial-vals">${h.valor_anterior ? `<span>${h.valor_anterior}</span> → ` : ""}<span>${h.valor_nuevo || "—"}</span></div>
      </div>
      <div class="historial-fecha">${fecha}</div>
    </div>`;
  }).join("");
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
  iniciarDragDrop();
}

function iniciarDragDrop() {
  const grid = document.getElementById("fotos-actuales");
  let dragging = null;
  grid.querySelectorAll(".foto-item").forEach(item => {
    item.addEventListener("dragstart", () => { dragging = item; item.style.opacity = "0.4"; });
    item.addEventListener("dragend",   () => { dragging = null; item.style.opacity = "1"; guardarOrdenFotos(); });
    item.addEventListener("dragover",  e => e.preventDefault());
    item.addEventListener("drop", e => {
      e.preventDefault();
      if (dragging && dragging !== item) {
        const items = [...grid.querySelectorAll(".foto-item")];
        if (items.indexOf(dragging) < items.indexOf(item)) item.after(dragging);
        else item.before(dragging);
      }
    });
  });
}

async function guardarOrdenFotos() {
  const orden = [...document.querySelectorAll(".foto-item")].map(el => parseInt(el.dataset.id));
  try {
    await fetch(`${API}/api/coches/${cocheEditandoId}/orden-fotos`, {
      method:"PATCH", headers:authHeaders(), body:JSON.stringify(orden),
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

  const payload = {
    marca:           document.getElementById("e-marca").value.trim(),
    modelo:          document.getElementById("e-modelo").value.trim(),
    anio:            parseInt(document.getElementById("e-anio").value),
    precio:          parseFloat(document.getElementById("e-precio").value),
    precio_anterior: parseFloat(document.getElementById("e-precio-anterior").value) || null,
    km:              parseInt(document.getElementById("e-km").value),
    combustible:     document.getElementById("e-combustible").value,
    caja:            document.getElementById("e-caja").value,
    cv:              parseInt(document.getElementById("e-cv").value) || null,
    carroceria:      document.getElementById("e-carroceria").value,
    color:           document.getElementById("e-color").value.trim() || null,
    descripcion:     document.getElementById("e-descripcion").value.trim() || null,
    notas_internas:  document.getElementById("e-notas").value.trim() || null,
    video_youtube:   document.getElementById("e-video").value.trim() || null,
    historial_km:    document.getElementById("e-historial-km")?.value.trim() || null,
    etiqueta_dgt:    document.getElementById("e-etiqueta")?.value || null,
    destacado:       document.getElementById("e-destacado").checked,
  };

  try {
    const resp = await fetch(`${API}/api/coches/${cocheEditandoId}`, {
      method:"PATCH", headers:authHeaders(), body:JSON.stringify(payload),
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
    const resp = await fetch(`${API}/api/fotos/subir/${cocheEditandoId}?redimensionar=${redimensionar}&marca_agua=${marcaAgua}`, {
      method:"POST", headers:{"Authorization": `Bearer ${getToken()}`}, body: formData,
    });
    if (!resp.ok) throw new Error();
    input.value = "";
    msgOk.style.display = "block";
    toast("✅ Fotos subidas");
    const [respC, respF] = await Promise.all([
      fetch(`${API}/api/coches/${cocheEditandoId}`, {headers:authHeaders()}),
      fetch(`${API}/api/fotos/${cocheEditandoId}`,  {headers:authHeaders()}),
    ]);
    renderFotosEditar(await respF.json(), (await respC.json()).foto_portada);
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
    const resp = await fetch(`${API}/api/fotos/${fotoId}`, {method:"DELETE", headers:authHeaders()});
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
      method:"PATCH", headers:authHeaders(), body:JSON.stringify({foto_portada: url}),
    });
    if (!resp.ok) throw new Error();
    toast("✅ Portada actualizada");
    const [respC, respF] = await Promise.all([
      fetch(`${API}/api/coches/${cocheEditandoId}`, {headers:authHeaders()}),
      fetch(`${API}/api/fotos/${cocheEditandoId}`,  {headers:authHeaders()}),
    ]);
    renderFotosEditar(await respF.json(), (await respC.json()).foto_portada);
    await cargarListaCoches();
  } catch { toast("Error al cambiar portada", true); }
}

document.getElementById("modal-editar").addEventListener("click", function(e) {
  if (e.target === this) cerrarModal();
});


// ── CONFIGURACIÓN ─────────────────────────────────────────────────────────────
async function cargarConfig() {
  try {
    const resp = await fetch(`${API}/api/config/admin`, {headers: authHeaders()});
    const cfg  = await resp.json();

    document.getElementById("cfg-calculadora").checked = cfg.modulo_calculadora !== false;
    document.getElementById("cfg-comparador").checked  = cfg.modulo_comparador !== false;
    document.getElementById("cfg-alertas").checked     = cfg.modulo_alertas !== false;
    document.getElementById("cfg-garantia").checked    = cfg.garantia_activa || false;
    document.getElementById("cfg-chat").checked        = cfg.modulo_chat || false;
    document.getElementById("cfg-nombre").value        = cfg.nombre_negocio || "";
    document.getElementById("cfg-whatsapp").value      = cfg.whatsapp || "";
    document.getElementById("cfg-telefono").value      = cfg.telefono || "";
    if (document.getElementById("cfg-ciudad"))    document.getElementById("cfg-ciudad").value    = cfg.ciudad || "";
    if (document.getElementById("cfg-direccion")) document.getElementById("cfg-direccion").value = cfg.direccion || "";
    if (document.getElementById("cfg-horario"))   document.getElementById("cfg-horario").value   = cfg.horario || "";
    document.getElementById("cfg-dominio").value       = cfg.dominio || "";
    document.getElementById("cfg-analytics").value     = cfg.analytics_id || "";
    document.getElementById("cfg-tin").value           = cfg.calc_tin || 6.99;
    document.getElementById("cfg-plazo").value         = cfg.calc_plazo_max || 84;
    document.getElementById("cfg-entrada").value       = cfg.calc_entrada_min || 10;
    document.getElementById("cfg-garantia-txt").value  = cfg.garantia_texto || "";
    document.getElementById("cfg-chat-codigo").value   = cfg.chat_codigo || "";
  } catch { toast("Error al cargar configuración", true); }
}

async function guardarToggle(campo, valor) {
  try {
    await fetch(`${API}/api/config`, {
      method:"PATCH", headers:authHeaders(),
      body: JSON.stringify({[campo]: valor}),
    });
    toast(valor ? "✅ Módulo activado" : "Módulo desactivado");
  } catch { toast("Error al guardar", true); }
}

async function guardarConfig() {
  const msgOk  = document.getElementById("msg-cfg-ok");
  const msgErr = document.getElementById("msg-cfg-err");
  msgOk.style.display = msgErr.style.display = "none";

  const payload = {
    nombre_negocio:    document.getElementById("cfg-nombre").value.trim() || null,
    whatsapp:          document.getElementById("cfg-whatsapp").value.trim() || null,
    telefono:          document.getElementById("cfg-telefono").value.trim() || null,
    coletilla_descripcion: document.getElementById("cfg-coletilla")?.value.trim() || null,
    ciudad:            document.getElementById("cfg-ciudad")?.value.trim() || null,
    direccion:         document.getElementById("cfg-direccion")?.value.trim() || null,
    horario:           document.getElementById("cfg-horario")?.value.trim() || null,
    dominio:           document.getElementById("cfg-dominio").value.trim() || null,
    analytics_id:      document.getElementById("cfg-analytics").value.trim() || null,
    calc_tin:          parseFloat(document.getElementById("cfg-tin").value) || null,
    calc_plazo_max:    parseInt(document.getElementById("cfg-plazo").value) || null,
    calc_entrada_min:  parseInt(document.getElementById("cfg-entrada").value) || null,
    garantia_texto:    document.getElementById("cfg-garantia-txt").value.trim() || null,
    chat_codigo:       document.getElementById("cfg-chat-codigo").value.trim() || null,
    modulo_calculadora: document.getElementById("cfg-calculadora").checked,
    modulo_comparador:  document.getElementById("cfg-comparador").checked,
    modulo_alertas:     document.getElementById("cfg-alertas").checked,
    garantia_activa:    document.getElementById("cfg-garantia").checked,
    modulo_chat:        document.getElementById("cfg-chat").checked,
  };

  try {
    const resp = await fetch(`${API}/api/config`, {
      method:"PATCH", headers:authHeaders(), body:JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error();
    msgOk.style.display = "block";
    toast("✅ Configuración guardada");
  } catch {
    msgErr.style.display = "block";
    toast("Error al guardar configuración", true);
  }
}


// ── EXPORTAR PDF ──────────────────────────────────────────────────────────────
async function exportarPDF() {
  toast("Generando PDF...");
  try {
    const resp   = await fetch(`${API}/api/coches?estado=disponible&por_pagina=100`, {headers: authHeaders()});
    const data   = await resp.json();
    const coches = data.coches || [];

    const win = window.open("", "_blank");
    win.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="UTF-8"/>
      <title>Catálogo Ananta Cars</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px;color:#111}
        h1{color:#e8311a;margin-bottom:4px}
        .fecha{color:#888;font-size:0.85rem;margin-bottom:24px}
        table{width:100%;border-collapse:collapse;font-size:0.85rem}
        th{background:#e8311a;color:#fff;padding:8px 10px;text-align:left}
        td{padding:8px 10px;border-bottom:1px solid #ddd}
        tr:nth-child(even) td{background:#f9f9f9}
        .precio{font-weight:bold}
        @media print{body{padding:0}}
      </style></head><body>
      <h1>Catálogo Ananta Cars</h1>
      <div class="fecha">Generado el ${new Date().toLocaleDateString("es-ES")} · ${coches.length} vehículos disponibles</div>
      <table>
        <thead><tr><th>Marca</th><th>Modelo</th><th>Año</th><th>Km</th><th>Combustible</th><th>CV</th><th>Precio</th></tr></thead>
        <tbody>
          ${coches.map(c => `
            <tr>
              <td>${c.marca}</td>
              <td>${c.modelo}</td>
              <td>${c.anio}</td>
              <td>${new Intl.NumberFormat("es-ES").format(c.km)} km</td>
              <td>${c.combustible}</td>
              <td>${c.cv || "—"}</td>
              <td class="precio">${new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(c.precio)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
      <script>window.onload=()=>window.print()<\/script>
      </body></html>`);
    win.document.close();
  } catch { toast("Error al generar PDF", true); }
}
