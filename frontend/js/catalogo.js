

function etiquetaDGT(etiqueta) {
  if (!etiqueta) return "";
  const map = {
    "0":   { cls:"dgt-0",   circulo:"0",   txt:"0 Emisiones" },
    "eco": { cls:"dgt-eco", circulo:"ECO", txt:"ECO" },
    "c":   { cls:"dgt-c",   circulo:"C",   txt:"C" },
    "b":   { cls:"dgt-b",   circulo:"B",   txt:"B" },
  };
  const e = map[(etiqueta||"").toLowerCase()];
  if (!e) return "";
  return `<span class="dato"><span class="dgt-badge ${e.cls}"><span class="dgt-circle">${e.circulo}</span>${e.txt}</span></span>`;
}

// ── CUOTA MENSUAL estimada (TIN 7%, 60 meses, 10% entrada) ───────────────────
function calcCuota(precio, tin = 7, meses = 60, entradaPct = 10) {
  const capital = precio * (1 - entradaPct / 100);
  const r = tin / 100 / 12;
  return capital * (r * Math.pow(1+r, meses)) / (Math.pow(1+r, meses) - 1);
}

// catalogo.js — v3 con scroll infinito, comparador y carga desde config
const API = "https://anantacars-production.up.railway.app";

let paginaActual = 1;
let hayMas = true;
let cargando = false;
let filtrosActivos = {};
let cochesSel = {}; // comparador

// ── CONFIG ────────────────────────────────────────────────────────────────────
let cfg = {};
async function cargarConfig() {
  try {
    const r = await fetch(`${API}/api/config`);
    cfg = await r.json();
    // Actualizar WhatsApp si está en config
    if (cfg.whatsapp) {
      document.querySelectorAll('a[href*="wa.me"]').forEach(a => {
        a.href = a.href.replace(/wa\.me\/\d+/, `wa.me/${cfg.whatsapp}`);
      });
    }
  } catch {}
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function formatPrecio(n) {
  return new Intl.NumberFormat("es-ES", {style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
}
function formatKm(n) { return new Intl.NumberFormat("es-ES").format(n) + " km"; }

function estadoBadge(estado) {
  const map = {disponible:["estado-disponible","Disponible"],reservado:["estado-reservado","Reservado"],vendido:["estado-vendido","Vendido"]};
  const [cls,txt] = map[estado] || ["estado-disponible",estado];
  return `<span class="estado-badge ${cls}">${txt}</span>`;
}

function renderTarjeta(c) {
  const foto = c.foto_portada
    ? `<div class="foto-bg" style="background-image:url('${c.foto_portada}')"></div><img src="${c.foto_portada}" alt="${c.marca} ${c.modelo}" loading="lazy"/>`
    : `<div class="tarjeta-foto-placeholder">🚗</div>`;

  const precioHTML = c.precio_anterior
    ? `${formatPrecio(c.precio)} <span class="precio-anterior">${formatPrecio(c.precio_anterior)}</span>`
    : formatPrecio(c.precio);

  const seleccionado = cochesSel[c.id] ? "seleccionado" : "";
  const txtComparar = cochesSel[c.id] ? "✓ Comparando" : "+ Comparar";

  // URL limpia
  const slug = `${c.marca}-${c.modelo}-${c.anio}`.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
  const ciudadTag = cfg.ciudad ? `<span class="dato">📍 ${cfg.ciudad}</span>` : "";

  return `
    <div class="${c.destacado ? 'tarjeta tarjeta-destacada' : 'tarjeta'}" onclick="irFicha(event, ${c.id}, '${slug}')">
      <div class="tarjeta-foto">
        ${foto}
        ${estadoBadge(c.estado)}
        ${c.destacado ? '<span class="destacado-badge">⭐ Destacado</span>' : ""}
        ${c.foto_portada ? `<span class="fotos-badge" id="fotos-count-${c.id}">📷</span>` : ""}
        ${c.precio_anterior ? '<span class="oferta-badge">🔥 Bajada de precio</span>' : ""}
      </div>
      <div class="tarjeta-info">
        <div class="tarjeta-header">
          <div class="tarjeta-marca">${c.marca}</div>
          ${cfg.modulo_comparador !== false ? `<button class="btn-comparar-tarjeta ${seleccionado}" onclick="toggleComparar(event, ${c.id}, '${c.marca} ${c.modelo}')">${txtComparar}</button>` : ""}
        </div>
        <div class="tarjeta-nombre">${c.modelo} <small style="font-weight:400;color:var(--gris-texto)">${c.anio}</small></div>
        <div class="tarjeta-datos">
          <span class="dato">⏱ ${formatKm(c.km)}</span>
          <span class="dato">⛽ ${c.combustible}</span>
          ${c.cv ? `<span class="dato">💨 ${c.cv} CV</span>` : ""}
          <span class="dato">⚙️ ${c.caja}</span>
          ${etiquetaDGT(c.etiqueta_dgt)}
          ${ciudadTag}
        </div>
        <div class="tarjeta-footer">
          <span class="tarjeta-precio">${precioHTML}<span id="badge-${c.id}" class="precio-badge" style="display:none"></span></span>
          <a class="btn-ver" href="/coches/${slug}-id${c.id}" onclick="event.stopPropagation()">Ver ficha →</a>
        </div>
      </div>
    </div>`;
}

function irFicha(e, id, slug) {
  if (e.target.classList.contains("btn-comparar-tarjeta") || e.target.classList.contains("btn-ver")) return;
  window.location.href = `/coches/${slug}-id${id}`;
}

// ── BÚSQUEDA Y PAGINACIÓN ─────────────────────────────────────────────────────
async function buscar(reset = true) {
  if (cargando) return;
  cargando = true;

  const grid     = document.getElementById("grid-coches");
  const contador = document.getElementById("contador-txt");

  if (reset) {
    paginaActual = 1;
    hayMas = true;
    grid.innerHTML = `
      <div class="tarjeta"><div class="tarjeta-foto skeleton"></div></div>
      <div class="tarjeta"><div class="tarjeta-foto skeleton"></div></div>
      <div class="tarjeta"><div class="tarjeta-foto skeleton"></div></div>`;
    contador.innerHTML = "Buscando...";
  }

  filtrosActivos = {};
  const marca      = document.getElementById("f-marca").value.trim();
  const combustible = document.getElementById("f-combustible").value;
  const carroceria  = document.getElementById("f-carroceria").value;
  const precio     = document.getElementById("f-precio").value;
  const km         = document.getElementById("f-km").value;
  const estado     = document.getElementById("f-estado").value;

  const params = new URLSearchParams({ pagina: paginaActual, por_pagina: 12, orden: "destacado.desc,creado_at.desc" });
  if (marca)       { params.set("marca", marca);             filtrosActivos.marca = marca; }
  if (combustible) { params.set("combustible", combustible); filtrosActivos.combustible = combustible; }
  if (carroceria)  { params.set("carroceria", carroceria);   filtrosActivos.carroceria = carroceria; }
  if (precio)      { params.set("precio_max", precio);       filtrosActivos.precio_max = precio; }
  if (km)          { params.set("km_max", km);               filtrosActivos.km_max = km; }

  const etiqueta = document.getElementById("f-etiqueta")?.value;
  if (etiqueta)    { params.set("etiqueta", etiqueta);       filtrosActivos.etiqueta = etiqueta; }

  // Filtro cuota: convertir cuota mensual a precio máximo estimado
  const cuota = parseFloat(document.getElementById("f-cuota")?.value);
  if (cuota > 0) {
    const precioMaxEstimado = Math.round(cuota / calcCuota(1));
    params.set("precio_max", precioMaxEstimado);
    filtrosActivos.precio_max = precioMaxEstimado;
  }
  if (estado)      { params.set("estado", estado);           filtrosActivos.estado = estado; }

  try {
    const resp = await fetch(`${API}/api/coches?${params}`);
    if (!resp.ok) {
      console.error("API error:", resp.status, await resp.text());
      throw new Error(`HTTP ${resp.status}`);
    }
    const data = await resp.json();
    console.log("API response:", data);

    // Compatible con backend viejo (array) y nuevo (objeto con .coches)
    const coches = Array.isArray(data) ? data : (data.coches || []);
    const total   = Array.isArray(data) ? data.length : (data.total || coches.length);
    hayMas = Array.isArray(data) ? false : (data.hay_mas || false);

    if (reset) {
      if (!coches.length) {
        grid.innerHTML = `<div class="vacio"><p>No hay vehículos con esos filtros. Prueba a ampliar la búsqueda.</p></div>`;
        contador.innerHTML = "0 resultados";
        cargando = false;
        return;
      }
      grid.innerHTML = coches.map(renderTarjeta).join("");
    } else {
      document.querySelector(".cargando-mas")?.remove();
      coches.forEach(c => {
        const div = document.createElement("div");
        div.innerHTML = renderTarjeta(c);
        grid.appendChild(div.firstElementChild);
      });
    }

    if (hayMas) {
      const loader = document.createElement("div");
      loader.className = "cargando-mas";
      loader.id = "scroll-trigger";
      loader.innerHTML = `<span style="color:var(--gris-texto);font-size:0.85rem">Cargando más vehículos...</span>`;
      grid.appendChild(loader);
      observarScroll();
    }

    contador.innerHTML = `<strong>${total}</strong> vehículo${total !== 1 ? "s" : ""} encontrado${total !== 1 ? "s" : ""}`;
    // Cargar badges de precio y contador fotos en segundo plano
    coches.forEach(c => { cargarBadgePrecio(c.id); if (c.foto_portada) cargarContadorFotos(c.id); });
    paginaActual++;

  } catch (err) {
    console.error("Error en buscar():", err);
    if (reset) grid.innerHTML = `<div class="vacio"><p>Error al cargar el catálogo. Inténtalo de nuevo.</p></div>`;
    contador.innerHTML = "Error de conexión";
  }

  cargando = false;
}

// ── SCROLL INFINITO ───────────────────────────────────────────────────────────
let observer = null;
function observarScroll() {
  if (observer) observer.disconnect();
  const trigger = document.getElementById("scroll-trigger");
  if (!trigger) return;
  observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && hayMas && !cargando) {
      buscar(false);
    }
  }, { rootMargin: "200px" });
  observer.observe(trigger);
}

function resetFiltros() {
  ["f-marca","f-precio","f-km","f-cuota"].forEach(id => { const el=document.getElementById(id); if(el) el.value=""; });
  document.getElementById("f-combustible").value = "";
  const fe = document.getElementById("f-etiqueta"); if(fe) fe.value = "";
  document.getElementById("f-carroceria").value = "";
  document.getElementById("f-estado").value = "disponible";
  buscar();
}

// ── COMPARADOR ────────────────────────────────────────────────────────────────
function toggleComparar(e, id, nombre) {
  e.stopPropagation();
  if (cochesSel[id]) {
    delete cochesSel[id];
  } else {
    if (Object.keys(cochesSel).length >= 3) {
      alert("Máximo 3 vehículos para comparar");
      return;
    }
    cochesSel[id] = nombre;
  }
  actualizarBarraComparar();
  // Actualizar botón en tarjeta
  const btn = e.target;
  if (cochesSel[id]) {
    btn.classList.add("seleccionado");
    btn.textContent = "✓ Comparando";
  } else {
    btn.classList.remove("seleccionado");
    btn.textContent = "+ Comparar";
  }
}

function actualizarBarraComparar() {
  const barra    = document.getElementById("barra-comparar");
  const barraC   = document.getElementById("barra-coches");
  const header   = document.getElementById("btn-comparar-header");
  const numSpan  = document.getElementById("num-comparar");
  const n = Object.keys(cochesSel).length;

  if (n === 0) {
    barra.classList.remove("visible");
    header.classList.remove("visible");
    return;
  }

  barra.classList.add("visible");
  header.classList.add("visible");
  if (numSpan) numSpan.textContent = n;

  barraC.innerHTML = Object.entries(cochesSel).map(([id, nombre]) => `
    <div class="barra-coche">
      <span style="font-size:0.8rem">${nombre}</span>
      <button onclick="quitarDeComparar(${id})">✕</button>
    </div>`).join("");
}

function quitarDeComparar(id) {
  delete cochesSel[id];
  actualizarBarraComparar();
  document.querySelectorAll(`.btn-comparar-tarjeta`).forEach(btn => {
    if (btn.closest(".tarjeta")?.querySelector(`[onclick*="irFicha(event, ${id},"]`)) {
      btn.classList.remove("seleccionado");
      btn.textContent = "+ Comparar";
    }
  });
  // Recargar para actualizar estados
  buscar();
}

function limpiarComparar() {
  cochesSel = {};
  actualizarBarraComparar();
  buscar();
}

function irAComparar() {
  const ids = Object.keys(cochesSel).join(",");
  if (ids) window.location.href = `/comparar?ids=${ids}`;
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await cargarConfig();
  buscar();
});

document.getElementById("f-marca")?.addEventListener("keydown", e => e.key === "Enter" && buscar());
document.getElementById("f-precio")?.addEventListener("keydown", e => e.key === "Enter" && buscar());
document.getElementById("f-km")?.addEventListener("keydown", e => e.key === "Enter" && buscar());


// ── BADGE PRECIO (carga lazy) ─────────────────────────────────────────────────
async function cargarBadgePrecio(cocheId) {
  try {
    const resp = await fetch(`${API}/api/coches/badge-precio/${cocheId}`);
    const data = await resp.json();
    if (!data.badge) return;
    const el = document.getElementById(`badge-${cocheId}`);
    if (!el) return;
    el.textContent = data.label;
    el.style.background = data.color;
    el.style.color = data.text_color;
    el.style.display = "inline-flex";
  } catch {}
}

// ── CONTADOR FOTOS ────────────────────────────────────────────────────────────
async function cargarContadorFotos(cocheId) {
  try {
    const resp = await fetch(`${API}/api/fotos/${cocheId}`);
    const fotos = await resp.json();
    const el = document.getElementById(`fotos-count-${cocheId}`);
    if (el && fotos.length) el.textContent = `📷 ${fotos.length} foto${fotos.length > 1 ? "s" : ""}`;
  } catch {}
}
