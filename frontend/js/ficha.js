
// ── FORMULARIO CONTACTO WEB3FORMS ─────────────────────────────────────────────
const W3F_KEY = "72cf4bcd-025f-4f7e-95d7-0f5554625ab4";

async function enviarConsulta(vehiculo, cocheId) {
  const nombre   = document.getElementById("fc-nombre")?.value.trim();
  const telefono = document.getElementById("fc-telefono")?.value.trim();
  const mensaje  = document.getElementById("fc-mensaje")?.value.trim();
  const msgEl    = document.getElementById("fc-msg");
  const btn      = document.querySelector(".btn-enviar-consulta");

  if (!nombre || !telefono) {
    msgEl.textContent = "Por favor rellena tu nombre y teléfono.";
    msgEl.style.color = "#ff8f8f";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Enviando...";

  try {
    const resp = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_key: W3F_KEY,
        subject: `Consulta sobre ${vehiculo} — Ananta Cars`,
        name: nombre,
        phone: telefono,
        message: mensaje,
        vehicle: vehiculo,
        vehicle_url: window.location.href,
        from_name: "Ananta Cars Web",
      }),
    });
    const data = await resp.json();
    if (data.success) {
      msgEl.textContent = "✅ Consulta enviada. Te contactamos pronto.";
      msgEl.style.color = "#7fffaa";
      document.getElementById("fc-nombre").value   = "";
      document.getElementById("fc-telefono").value = "";
      document.getElementById("fc-mensaje").value  = "";
    } else {
      throw new Error();
    }
  } catch {
    msgEl.textContent = "❌ Error al enviar. Usa WhatsApp o llámanos.";
    msgEl.style.color = "#ff8f8f";
  } finally {
    btn.disabled = false;
    btn.textContent = "Enviar consulta →";
  }
}


function etiquetaDGTHtml(etiqueta) {
  if (!etiqueta) return "";
  const map = {
    "0":   { cls:"dgt-0",   circulo:"0",   txt:"0 Emisiones" },
    "eco": { cls:"dgt-eco", circulo:"ECO", txt:"ECO" },
    "c":   { cls:"dgt-c",   circulo:"C",   txt:"Etiqueta C" },
    "b":   { cls:"dgt-b",   circulo:"B",   txt:"Etiqueta B" },
  };
  const e = map[(etiqueta||"").toLowerCase()];
  if (!e) return "";
  return `<div class="dato-fila"><span class="dato-fila-label">Etiqueta DGT</span><span class="dato-fila-valor"><span class="dgt-badge ${e.cls}"><span class="dgt-circle">${e.circulo}</span>${e.txt}</span></span></div>`;
}

// ── FORMATEAR DESCRIPCIÓN ────────────────────────────────────────────────────
function formatDescripcion(texto) {
  return texto
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .split('\n')
    .map(linea => {
      linea = linea.trim();
      if (!linea) return '';
      // Detectar líneas tipo "- item" o "• item" como lista visual
      if (linea.match(/^[-•*]\s/)) {
        return `<span style="display:flex;gap:8px;margin-bottom:4px"><span style="color:var(--rojo);flex-shrink:0">›</span><span>${linea.slice(2)}</span></span>`;
      }
      return `<span style="display:block;margin-bottom:6px">${linea}</span>`;
    })
    .join('');
}

// ficha.js — v3 completo con lightbox, calculadora, URLs limpias, alertas
const API = "https://anantacars-production.up.railway.app";
const WA  = "34600000000";

let fotosGlobal = [];
let fotoActualIdx = 0;
let cfgGlobal = {};

function formatPrecio(n) { return new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n); }
function formatKm(n) { return new Intl.NumberFormat("es-ES").format(n) + " km"; }
function estadoClase(e) { return {disponible:"estado-disponible",reservado:"estado-reservado",vendido:"estado-vendido"}[e]||"estado-disponible"; }
function estadoTxt(e) { return {disponible:"Disponible",reservado:"Reservado",vendido:"Vendido"}[e]||e; }
function youtubeEmbed(url) {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

// Extraer ID de URL limpia o query param
function extractId() {
  const path = window.location.pathname;
  // /coches/seat-leon-2019-id42
  const mPath = path.match(/id(\d+)$/);
  if (mPath) return mPath[1];
  // ?id=42
  return new URLSearchParams(window.location.search).get("id");
}

async function cargarFicha() {
  const id = extractId();
  if (!id) { window.location.href = "/404.html"; return; }

  const wrap = document.getElementById("ficha-wrap");

  try {
    const [respCoche, respFotos, respCfg] = await Promise.all([
      fetch(`${API}/api/coches/${id}`),
      fetch(`${API}/api/fotos/${id}`),
      fetch(`${API}/api/config`),
    ]);

    if (!respCoche.ok) { window.location.href = "/404.html"; return; }

    const c     = await respCoche.json();
    const fotos = await respFotos.json();
    cfgGlobal   = await respCfg.json().catch(() => ({}));

    fotosGlobal = fotos;

    const waNum = cfgGlobal.whatsapp || WA;
    const garantiaActiva = cfgGlobal.garantia_activa;
    const garantiaTxt    = cfgGlobal.garantia_texto || "Garantía incluida";
    const calcActiva     = cfgGlobal.modulo_calculadora !== false;
    const alertasActivas = cfgGlobal.modulo_alertas !== false;

    // SEO — título y meta tags
    document.title = `${c.marca} ${c.modelo} ${c.anio} — ${formatPrecio(c.precio)} | Ananta Cars`;
    const setMeta = (prop, val, attr="property") => {
      let el = document.querySelector(`meta[${attr}="${prop}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, prop); document.head.appendChild(el); }
      el.setAttribute("content", val);
    };
    setMeta("description", `${c.marca} ${c.modelo} ${c.anio}, ${formatKm(c.km)}, ${c.combustible}. ${formatPrecio(c.precio)}.`, "name");
    setMeta("og:title",       `${c.marca} ${c.modelo} ${c.anio} — ${formatPrecio(c.precio)}`);
    setMeta("og:description", `${formatKm(c.km)} · ${c.combustible} · ${c.caja}`);
    setMeta("og:image",       fotos[0]?.url || "");
    setMeta("og:url",         window.location.href);

    // URL canónica limpia
    const slug = `${c.marca}-${c.modelo}-${c.anio}`.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
    const urlLimpia = `/coches/${slug}-id${c.id}`;
    if (window.location.search.includes("id=") && window.history.replaceState) {
      window.history.replaceState({}, "", urlLimpia);
    }

    const fotoPortada = fotos[0]?.url || null;
    const embedYT     = youtubeEmbed(c.video_youtube);
    const waMsg       = encodeURIComponent(`Hola, me interesa el ${c.marca} ${c.modelo} ${c.anio} por ${formatPrecio(c.precio)}`);
    const shareUrl    = encodeURIComponent(window.location.href);
    const shareTitle  = encodeURIComponent(`${c.marca} ${c.modelo} ${c.anio} — ${formatPrecio(c.precio)}`);

    const miniaturasHTML = fotos.length > 1
      ? fotos.map((f,i) => `<div class="miniatura ${i===0?"activa":""}" data-idx="${i}" onclick="cambiarFoto(${i})"><img src="${f.url}" alt="Foto ${i+1}" loading="lazy"/></div>`).join("")
      : "";

    wrap.innerHTML = `
      <!-- GALERÍA -->
      <div class="galeria">
        <div class="foto-principal" onclick="abrirLightbox(${fotoActualIdx})" id="foto-principal-wrap">
          ${fotoPortada
            ? `<div class="foto-bg-principal" style="background-image:url('${fotoPortada}')" id="foto-bg"></div>
               <img src="${fotoPortada}" alt="${c.marca} ${c.modelo}" id="foto-main"/>`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:4rem;opacity:0.2;position:relative;z-index:1">🚗</div>`
          }
          ${fotos.length > 1 ? `
          <button class="nav-foto nav-prev" onclick="event.stopPropagation();cambiarFoto(fotoActualIdx-1)">‹</button>
          <button class="nav-foto nav-next" onclick="event.stopPropagation();cambiarFoto(fotoActualIdx+1)">›</button>` : ""}
          ${fotos.length ? `<button class="btn-fullscreen" onclick="event.stopPropagation();abrirLightbox(fotoActualIdx)">⛶ Pantalla completa</button>` : ""}
        </div>
        ${miniaturasHTML ? `<div class="miniaturas">${miniaturasHTML}</div>` : ""}
      </div>

      <!-- LAYOUT -->
      <div class="ficha-layout">
        <div>
          ${garantiaActiva ? `<div class="sello-garantia">✅ ${garantiaTxt}</div>` : ""}
          <p class="ficha-marca">${c.marca}</p>
          <h1 class="ficha-titulo">${c.modelo}</h1>
          <p class="ficha-anio">${c.anio} · ${c.carroceria}${c.color ? ` · ${c.color}` : ""}</p>

          <div class="ficha-datos">
            <div class="dato-fila"><span class="dato-fila-label">Kilómetros</span><span class="dato-fila-valor">${formatKm(c.km)}</span></div>
            <div class="dato-fila"><span class="dato-fila-label">Combustible</span><span class="dato-fila-valor">${c.combustible}</span></div>
            <div class="dato-fila"><span class="dato-fila-label">Cambio</span><span class="dato-fila-valor">${c.caja}</span></div>
            ${c.cv ? `<div class="dato-fila"><span class="dato-fila-label">Potencia</span><span class="dato-fila-valor">${c.cv} CV</span></div>` : ""}
            ${etiquetaDGTHtml(c.etiqueta_dgt)}
          </div>

          ${c.descripcion ? `<div class="descripcion">${formatDescripcion(c.descripcion)}</div>` : ""}

          ${calcActiva ? renderCalculadora(c.precio, cfgGlobal) : ""}

          ${embedYT ? `<div class="video-wrap"><h3>Vídeo del vehículo</h3><iframe class="video-embed" src="${embedYT}" allowfullscreen loading="lazy"></iframe></div>` : ""}
        </div>

        <!-- SIDEBAR -->
        <div class="sidebar">
          <span class="sidebar-estado ${estadoClase(c.estado)}">${estadoTxt(c.estado)}</span>
          <div class="sidebar-precio">${formatPrecio(c.precio)}</div>
          ${c.precio_anterior ? `<div class="sidebar-precio-anterior">${formatPrecio(c.precio_anterior)}</div><div class="sidebar-rebajado">🔥 PRECIO REBAJADO</div>` : ""}

          ${c.estado !== "vendido" ? `
          <!-- FORMULARIO CONTACTO -->
          <div class="form-contacto" id="form-contacto-wrap">
            <p class="form-contacto-titulo">✉️ Enviar consulta</p>
            <input class="form-contacto-input" id="fc-nombre" type="text" placeholder="Tu nombre" autocapitalize="sentences"/>
            <input class="form-contacto-input" id="fc-telefono" type="email" placeholder="Tu email" inputmode="email"/>
            <textarea class="form-contacto-input" id="fc-mensaje" rows="3" placeholder="¿Tienes alguna pregunta sobre este vehículo?">${c.marca} ${c.modelo} ${c.anio} — me interesa más información.</textarea>
            <button class="btn-enviar-consulta" onclick="enviarConsulta('${c.marca} ${c.modelo} ${c.anio}', '${c.id}')">Enviar consulta →</button>
            <p class="form-contacto-msg" id="fc-msg"></p>
          </div>
          <!-- BOTONES CONTACTO -->
          <a class="btn-whatsapp" href="https://wa.me/${waNum}?text=${waMsg}" target="_blank">📱 WhatsApp</a>
          <a class="btn-llamar" href="tel:+${cfgGlobal.telefono || '34688644229'}">
            <span>📞 Llamar</span>
            <span class="btn-llamar-num">${cfgGlobal.telefono ? cfgGlobal.telefono.replace(/^34/,'') : '688 644 229'}</span>
          </a>
          ` : `<p style="color:var(--gris-texto);font-size:0.9rem;margin-bottom:16px">Este vehículo ya ha sido vendido.</p>`}

          <div class="sidebar-compartir">
            <a class="btn-compartir" href="https://wa.me/?text=${shareTitle}%20${shareUrl}" target="_blank">💬 WhatsApp</a>
            <a class="btn-compartir" href="mailto:?subject=${shareTitle}&body=Mira este vehículo: ${shareUrl}" target="_blank">📧 Email</a>
            <button class="btn-compartir" onclick="copiarEnlace()">🔗 Link</button>
          </div>
          <p class="sidebar-aviso">Precio al contado. Consulta financiación.</p>

          ${alertasActivas ? `
          <div class="alerta-box">
            <p class="alerta-titulo">🔔 Avísame de coches similares</p>
            <input class="alerta-input" id="alerta-tel" type="tel" placeholder="Tu WhatsApp: 34612345678"/>
            <button class="btn-alerta" onclick="suscribirAlerta('${c.marca}')">Activar alerta</button>
            <p class="alerta-msg" id="alerta-msg"></p>
          </div>` : ""}
        </div>
      </div>`;

    // Registrar visita
    registrarVisita(c.id);
    // Badge precio
    cargarBadgeFicha(c.id);

    // Inyectar chat si está configurado
    if (cfgGlobal.modulo_chat && cfgGlobal.chat_codigo) {
      const div = document.createElement("div");
      div.innerHTML = cfgGlobal.chat_codigo;
      document.body.appendChild(div);
    }

  } catch (err) {
    wrap.innerHTML = `<div class="cargando">No se pudo cargar la ficha. <a href="index.html" style="color:var(--rojo)">Volver al catálogo</a></div>`;
    console.error(err);
  }
}

// ── GALERÍA ───────────────────────────────────────────────────────────────────
function cambiarFoto(idx) {
  if (!fotosGlobal.length) return;
  fotoActualIdx = ((idx % fotosGlobal.length) + fotosGlobal.length) % fotosGlobal.length;
  const url = fotosGlobal[fotoActualIdx]?.url;
  if (!url) return;
  const img = document.getElementById("foto-main");
  const bg  = document.getElementById("foto-bg");
  if (img) img.src = url;
  if (bg)  bg.style.backgroundImage = `url('${url}')`;
  document.querySelectorAll(".miniatura").forEach((m,i) => m.classList.toggle("activa", i === fotoActualIdx));
}

// ── LIGHTBOX ──────────────────────────────────────────────────────────────────
function abrirLightbox(idx) {
  if (!fotosGlobal.length) return;
  fotoActualIdx = idx;
  document.getElementById("lightbox-img").src = fotosGlobal[idx].url;
  document.getElementById("lightbox-counter").textContent = `${idx + 1} / ${fotosGlobal.length}`;
  document.getElementById("lightbox").classList.add("activo");
  document.body.style.overflow = "hidden";
}

function cerrarLightbox() {
  document.getElementById("lightbox").classList.remove("activo");
  document.body.style.overflow = "";
}

function lightboxNav(dir) {
  const newIdx = ((fotoActualIdx + dir + fotosGlobal.length) % fotosGlobal.length);
  fotoActualIdx = newIdx;
  document.getElementById("lightbox-img").src = fotosGlobal[newIdx].url;
  document.getElementById("lightbox-counter").textContent = `${newIdx + 1} / ${fotosGlobal.length}`;
}

document.addEventListener("keydown", e => {
  if (!document.getElementById("lightbox").classList.contains("activo")) return;
  if (e.key === "Escape") cerrarLightbox();
  if (e.key === "ArrowRight") lightboxNav(1);
  if (e.key === "ArrowLeft")  lightboxNav(-1);
});

// ── CALCULADORA ───────────────────────────────────────────────────────────────
function renderCalculadora(precio, cfg) {
  const tin     = cfg.calc_tin || 6.99;
  const plazoMax = cfg.calc_plazo_max || 84;
  const entradaMin = cfg.calc_entrada_min || 10;
  const entradaDef = Math.round(precio * (entradaMin / 100));

  return `
    <div class="calc-wrap">
      <p class="calc-titulo">💳 Calculadora de financiación</p>
      <div class="calc-grid">
        <div class="calc-campo">
          <label>Entrada (€)</label>
          <input type="number" id="calc-entrada" value="${entradaDef}" min="0" oninput="calcular(${precio})"/>
        </div>
        <div class="calc-campo">
          <label>Plazo (meses)</label>
          <select id="calc-plazo" onchange="calcular(${precio})">
            ${[12,24,36,48,60,72,84].filter(p => p <= plazoMax).map(p => `<option value="${p}" ${p===60?"selected":""}>${p} meses</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="calc-resultado">
        <div class="calc-cuota" id="calc-cuota">—</div>
        <div class="calc-detalle" id="calc-detalle">Introduce los datos para calcular</div>
      </div>
      <p style="font-size:0.68rem;color:var(--gris-texto);margin-top:8px;text-align:center">TIN ${tin}% orientativo. Consulta condiciones reales con el vendedor.</p>
    </div>`;
}

function calcular(precio) {
  const entrada = parseFloat(document.getElementById("calc-entrada")?.value) || 0;
  const plazo   = parseInt(document.getElementById("calc-plazo")?.value) || 60;
  const tin     = (cfgGlobal.calc_tin || 6.99) / 100 / 12;
  const capital = precio - entrada;

  if (capital <= 0) {
    document.getElementById("calc-cuota").textContent = "—";
    document.getElementById("calc-detalle").textContent = "La entrada cubre el precio total";
    return;
  }

  const cuota = capital * (tin * Math.pow(1+tin, plazo)) / (Math.pow(1+tin, plazo) - 1);
  const total = cuota * plazo + entrada;

  document.getElementById("calc-cuota").textContent = `${Math.round(cuota).toLocaleString("es-ES")} €/mes`;
  document.getElementById("calc-detalle").textContent = `${plazo} meses · Total aprox. ${Math.round(total).toLocaleString("es-ES")} €`;
}

// ── COMPARTIR ─────────────────────────────────────────────────────────────────
function copiarEnlace() {
  navigator.clipboard?.writeText(window.location.href)
    .then(() => alert("¡Enlace copiado!"))
    .catch(() => {});
}

// ── ALERTAS ───────────────────────────────────────────────────────────────────
async function suscribirAlerta(marca) {
  const tel = document.getElementById("alerta-tel")?.value.trim();
  const msg = document.getElementById("alerta-msg");
  if (!tel || tel.length < 9) {
    msg.textContent = "Introduce un número válido";
    msg.style.cssText = "display:block;color:#ff8f8f";
    return;
  }
  try {
    const resp = await fetch(`${API}/api/alertas/suscribir`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({telefono: tel, marca}),
    });
    if (resp.ok) {
      msg.textContent = "✅ Alerta activada — te avisaremos por WhatsApp";
      msg.style.cssText = "display:block;color:#7fffaa";
      document.getElementById("alerta-tel").value = "";
    } else throw new Error();
  } catch {
    msg.textContent = "Error al activar. Inténtalo de nuevo.";
    msg.style.cssText = "display:block;color:#ff8f8f";
  }
}

// ── VISITAS ───────────────────────────────────────────────────────────────────
async function registrarVisita(cocheId) {
  const key = `visita_${cocheId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  try { await fetch(`${API}/api/coches/${cocheId}/visita`, {method:"POST"}); } catch {}
}

// ── INIT ──────────────────────────────────────────────────────────────────────
cargarFicha();


// ── BADGE PRECIO EN FICHA ─────────────────────────────────────────────────────
async function cargarBadgeFicha(cocheId) {
  try {
    const resp = await fetch(`${API}/api/coches/badge-precio/${cocheId}`);
    const data = await resp.json();
    if (!data.badge) return;
    // Insertar badge junto al precio en sidebar
    const precioEl = document.querySelector(".sidebar-precio");
    if (!precioEl) return;
    const badge = document.createElement("div");
    badge.style.cssText = `display:inline-flex;align-items:center;gap:6px;font-family:var(--fuente-titulo);font-size:0.78rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:5px 12px;border-radius:4px;background:${data.color};color:${data.text_color};margin-bottom:12px`;
    badge.textContent = data.label;
    precioEl.after(badge);
  } catch {}
}
