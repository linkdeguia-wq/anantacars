


function etiquetaDGTInline(etiqueta) {
  const map = {
    "0":   { cls:"dgt-0",   circulo:"0",   txt:"0 Emisiones" },
    "eco": { cls:"dgt-eco", circulo:"ECO", txt:"ECO" },
    "c":   { cls:"dgt-c",   circulo:"C",   txt:"C" },
    "b":   { cls:"dgt-b",   circulo:"B",   txt:"B" },
  };
  const e = map[(etiqueta||"").toLowerCase()];
  if (!e) return "";
  return `<span class="spec-icon"><span class="dgt-badge ${e.cls}" style="font-size:0.65rem"><span class="dgt-circle" style="width:14px;height:14px">${e.circulo}</span>${e.txt}</span></span><span class="spec-val" style="display:none">.</span><span class="spec-label">Etiqueta DGT</span>`;
}


// ── WHATSAPP — función compartida (form + botón directo + sticky) ─────────────
function contactarWhatsApp(vehiculo) {
  const nombre  = document.getElementById("fc-nombre")?.value.trim();
  const email   = document.getElementById("fc-telefono")?.value.trim();
  const mensaje = document.getElementById("fc-mensaje")?.value.trim();
  const waNum   = cfgGlobal.whatsapp || "34688644229";
  const url     = window.location.href;

  const partes = [];
  if (nombre) partes.push(`Me llamo ${nombre}.`);
  // Si el form tiene texto úsalo; si no, mensaje genérico
  partes.push(mensaje || `Hola, estoy interesado en el ${vehiculo}.`);
  partes.push(`Anuncio: ${url}`);
  if (email) partes.push(`Mi email: ${email}`);

  window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(partes.join("\n\n"))}`, "_blank");
}

// ── ENVIAR FORMULARIO POR WHATSAPP ────────────────────────────────────────────
function enviarPorWhatsApp(vehiculo, cocheId) {
  contactarWhatsApp(vehiculo);
}


// ── FORMULARIO CONTACTO WEB3FORMS ─────────────────────────────────────────────
const W3F_KEY = "72cf4bcd-025f-4f7e-95d7-0f5554625ab4";

async function enviarConsulta(vehiculo, cocheId) {
  const nombre   = document.getElementById("fc-nombre")?.value.trim();
  const telefono = document.getElementById("fc-telefono")?.value.trim();
  const mensaje  = document.getElementById("fc-mensaje")?.value.trim();
  const msgEl    = document.getElementById("fc-msg");
  const btn      = document.querySelector(".btn-enviar-consulta");

  if (!nombre || !telefono) {
    msgEl.textContent = "Por favor rellena tu nombre y email.";
    msgEl.style.color = "#ff8f8f";
    return;
  }
  // Validar formato email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(telefono)) {
    msgEl.textContent = "Por favor introduce un email válido.";
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
      const wrap = document.getElementById("form-contacto-wrap");
      if (wrap) {
        wrap.innerHTML = `
          <div style="text-align:center;padding:20px 10px">
            <div style="font-size:2rem;margin-bottom:8px">✅</div>
            <div style="font-family:var(--fuente-titulo);font-size:1rem;font-weight:700;color:#7fffaa;margin-bottom:6px">¡Consulta enviada!</div>
            <div style="font-size:0.82rem;color:var(--gris-texto)">Te responderemos lo antes posible.</div>
          </div>`;
      }
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
    "c":   { cls:"dgt-c",   circulo:"C",   txt:"C" },
    "b":   { cls:"dgt-b",   circulo:"B",   txt:"B" },
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
function youtubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/);
  return m ? m[1] : null;
}
function youtubeEmbed(url) {
  const id = youtubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
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
    // Añadir vídeo al final de la galería si existe
    const _ytId = youtubeId(c.video_youtube);
    // Usar foto de portada del coche como thumbnail del vídeo (YouTube maxres falla a menudo)
    const _ytPortada = fotos[0]?.url || null;
    if (_ytId) fotosGlobal = [{ tipo: "video", videoId: _ytId, url: _ytPortada }, ...fotos];

    const waNum = cfgGlobal.whatsapp || WA;
    const garantiaActiva = cfgGlobal.garantia_activa;
    const garantiaTxt    = cfgGlobal.garantia_texto || "Garantía incluida";
    const calcActiva     = cfgGlobal.modulo_calculadora !== false;
    const alertasActivas = cfgGlobal.modulo_alertas !== false;

    // Redes sociales en footer
    renderRedesFooter(cfgGlobal, document.querySelector('footer .footer-col, footer'));

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

    const primeraEntrada = fotosGlobal[0];
    const esPrimeroVideo = primeraEntrada?.tipo === "video";
    const fotoPortada = esPrimeroVideo ? primeraEntrada.url : (fotos[0]?.url || null);
    const embedYT     = youtubeEmbed(c.video_youtube);
    const waMsg       = encodeURIComponent(`Hola, estoy interesado en el ${c.marca} ${c.modelo} ${c.anio} (${formatPrecio(c.precio)}) que vi en vuestra web.\n\nAnuncio: ${window.location.href}`);
    const shareUrl    = encodeURIComponent(window.location.href);
    const shareTitle  = encodeURIComponent(`${c.marca} ${c.modelo} ${c.anio} — ${formatPrecio(c.precio)}`);

    const miniaturasHTML = fotosGlobal.length > 1
      ? fotosGlobal.map((f,i) => {
          if (f.tipo === "video") {
            const thumb = f.url || "";
            return `<div class="miniatura miniatura-video" data-idx="${i}" onclick="cambiarFoto(${i})">
              ${thumb ? `<img src="${thumb}" alt="Vídeo" loading="lazy"/>` : `<div style="width:100%;height:100%;background:#111"></div>`}
              <div class="miniatura-play"><div class="yt-logo-mini">▶</div></div>
            </div>`;
          }
          return `<div class="miniatura ${i===0?"activa":""}" data-idx="${i}" onclick="cambiarFoto(${i})"><img src="${f.url}" alt="Foto ${i+1}" loading="lazy"/></div>`;
        }).join("")
      : "";

    wrap.innerHTML = `
      <!-- GALERÍA -->
      <div class="galeria">
        <div class="foto-principal" onclick="esPrimeroVideo && fotoActualIdx===0 ? null : abrirLightbox(fotoActualIdx)" id="foto-principal-wrap">
          ${fotoPortada
            ? `<div class="foto-bg-principal" style="background-image:url('${fotoPortada}')" id="foto-bg"></div>
               <img src="${fotoPortada}" alt="${esPrimeroVideo ? "Vídeo" : c.marca + " " + c.modelo}" id="foto-main" style="${esPrimeroVideo ? "opacity:0.82" : ""}"/>
               ${esPrimeroVideo ? '<div class="yt-play-overlay" onclick="event.stopPropagation();cambiarFoto(0)"><div class="yt-play-btn"></div><span class="yt-play-label">Ver vídeo</span></div>' : ""}`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:4rem;opacity:0.2;position:relative;z-index:1">🚗</div>`
          }
          ${fotosGlobal.length > 1 ? `
          <button class="nav-foto nav-prev" onclick="event.stopPropagation();cambiarFoto(fotoActualIdx-1)">‹</button>
          <button class="nav-foto nav-next" onclick="event.stopPropagation();cambiarFoto(fotoActualIdx+1)">›</button>` : ""}
          ${fotosGlobal.length ? `<button class="btn-fullscreen" onclick="event.stopPropagation();abrirLightbox(fotoActualIdx)">⛶ Pantalla completa</button>` : ""}
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

          <div class="ficha-specs">
            <div class="spec-item"><span class="spec-val">${formatKm(c.km)}</span><span class="spec-label">Kilómetros</span></div>
            <div class="spec-item"><span class="spec-val">${c.combustible.charAt(0).toUpperCase()+c.combustible.slice(1)}</span><span class="spec-label">Combustible</span></div>
            <div class="spec-item"><span class="spec-val">${c.caja.charAt(0).toUpperCase()+c.caja.slice(1)}</span><span class="spec-label">Cambio</span></div>
            ${c.cv ? `<div class="spec-item"><span class="spec-val">${c.cv} CV</span><span class="spec-label">Potencia</span></div>` : ""}
            ${c.puertas ? `<div class="spec-item"><span class="spec-val">${c.puertas} puertas</span><span class="spec-label">Carrocería</span></div>` : ""}
            ${c.plazas ? `<div class="spec-item"><span class="spec-val">${c.plazas} plazas</span><span class="spec-label">Capacidad</span></div>` : ""}
            ${c.propietarios ? `<div class="spec-item"><span class="spec-val">${c.propietarios === 1 ? "1 dueño" : c.propietarios+" dueños"}</span><span class="spec-label">Propietarios</span></div>` : ""}
            ${c.consumo ? `<div class="spec-item"><span class="spec-val">${c.consumo}</span><span class="spec-label">Consumo</span></div>` : ""}
            ${c.itv_hasta ? `<div class="spec-item"><span class="spec-val">${c.itv_hasta}</span><span class="spec-label">ITV hasta</span></div>` : ""}
            ${c.garantia_meses ? `<div class="spec-item spec-item-highlight"><span class="spec-val">${c.garantia_meses} meses</span><span class="spec-label">Garantía incluida</span></div>` : ""}
            ${c.etiqueta_dgt ? `<div class="spec-item">${etiquetaDGTInline(c.etiqueta_dgt)}</div>` : ""}
          </div>

          ${c.descripcion ? `<div class="descripcion">${formatDescripcion(c.descripcion)}</div>` : ""}

          ${calcActiva ? renderCalculadora(c.precio, cfgGlobal) : ""}

          ${c.historial_km ? `<div class="historial-km-wrap"><p class="historial-km-titulo">📋 Historial de mantenimiento</p><div class="historial-km-texto">${c.historial_km.split("\n").map(l => l.trim() ? `<span style="display:flex;gap:8px;margin-bottom:5px"><span style="color:var(--rojo);flex-shrink:0">›</span><span>${l}</span></span>` : "").join("")}</div></div>` : ""}
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
            <input class="form-contacto-input" id="fc-nombre" type="text" placeholder="¿Con quién hablamos?" autocapitalize="sentences"/>
            <input class="form-contacto-input" id="fc-telefono" type="email" placeholder="Tu email (ej: nombre@gmail.com)" inputmode="email"/>
            <textarea class="form-contacto-input" id="fc-mensaje" rows="5" id="fc-mensaje"></textarea>
            <div style="display:flex;gap:8px;margin-top:4px">
            <button class="btn-enviar-consulta" style="flex:1" onclick="enviarConsulta('${c.marca} ${c.modelo} ${c.anio}', '${c.id}')">📧 Enviar por email</button>
            <button class="btn-enviar-consulta" style="flex:1;background:#25d366;color:#000" onclick="enviarPorWhatsApp('${c.marca} ${c.modelo} ${c.anio}', '${c.id}')">💬 Por WhatsApp</button>
          </div>
            <p class="form-contacto-msg" id="fc-msg"></p>
          </div>
          <!-- BOTONES CONTACTO -->
          <button class="btn-whatsapp" onclick="contactarWhatsApp('${c.marca} ${c.modelo} ${c.anio}')">📱 Contactar vía WhatsApp</button>
          <a class="btn-llamar" href="tel:+${cfgGlobal.telefono || '34688644229'}">
            <span>📞 Llamar</span>
            <span class="btn-llamar-num">+34 ${cfgGlobal.telefono ? cfgGlobal.telefono.replace(/^34/,'') : '688 644 229'}</span>
          </a>
          ` : `<p style="color:var(--gris-texto);font-size:0.9rem;margin-bottom:16px">Este vehículo ya ha sido vendido.</p>`}

          <div class="sidebar-compartir">
            <a class="btn-compartir" href="mailto:?subject=${shareTitle}&body=Te comparto este vehículo: ${shareUrl}" target="_blank">📧 Compartir enlace</a>
            <button class="btn-compartir" onclick="copiarEnlace()">🔗 Copiar link</button>
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

    // Rellenar mensaje predefinido
    setTimeout(() => {
      const ta = document.getElementById("fc-mensaje");
      if (ta) {
        const precio = new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(c.precio);
        ta.value = "Hola, estoy interesado en el " + c.marca + " " + c.modelo + " " + c.anio + (c.color ? " en color " + c.color : "") + " por " + precio + ".\n\n¿Podéis darme más información?";
      }
    }, 100);
    // Registrar visita
    registrarVisita(c.id);
    // Sticky WA en móvil
    if (window.innerWidth < 780 && c.estado !== "vendido") {
      const waNum = cfgGlobal.whatsapp || WA;
      const waMsg = encodeURIComponent("Hola, estoy interesado en el " + c.marca + " " + c.modelo + " " + c.anio + " (" + formatPrecio(c.precio) + ").\n\nAnuncio: " + window.location.href);
      const sticky = document.createElement("a");
      sticky.href = "#";
      sticky.target = "_blank";
      sticky.onclick = (ev) => { ev.preventDefault(); contactarWhatsApp('${c.marca} ${c.modelo} ${c.anio}'); };
      sticky.style.cssText = "position:fixed;bottom:0;left:0;right:0;z-index:200;background:#25d366;color:#000;font-family:var(--fuente-titulo);font-weight:800;font-size:1rem;letter-spacing:0.06em;text-transform:uppercase;padding:16px;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 -2px 12px rgba(0,0,0,0.3)";
      sticky.innerHTML = "📱 Contactar vía WhatsApp";
      document.body.appendChild(sticky);
      // Añadir padding al footer para no tapar contenido
      document.querySelector("footer").style.paddingBottom = "80px";
    }
    // Badge precio
    cargarBadgeFicha(c.id);

    // Inyectar chat si está configurado
    if (cfgGlobal.modulo_chat && cfgGlobal.chat_codigo) {
      const div = document.createElement("div");
      div.innerHTML = cfgGlobal.chat_codigo;
      document.body.appendChild(div);
    }

  } catch (err) {
    wrap.innerHTML = `<div class="cargando">No se pudo cargar la ficha. <a href="/" style="color:var(--rojo)">Volver al catálogo</a></div>`;
    console.error(err);
  }
}

// ── GALERÍA ───────────────────────────────────────────────────────────────────
function cambiarFoto(idx) {
  if (!fotosGlobal.length) return;
  fotoActualIdx = ((idx % fotosGlobal.length) + fotosGlobal.length) % fotosGlobal.length;
  const item = fotosGlobal[fotoActualIdx];
  if (!item) return;

  const img  = document.getElementById("foto-main");
  const bg   = document.getElementById("foto-bg");
  const wrap = document.getElementById("foto-principal-wrap");

  // Eliminar iframe anterior si existe
  document.getElementById("yt-iframe")?.remove();

  if (item.tipo === "video") {
    // Mostrar vídeo — reemplazar imagen por iframe
    if (img) img.style.display = "none";
    if (bg)  bg.style.backgroundImage = `url('${item.url}')`;
    const iframe = document.createElement("iframe");
    iframe.id = "yt-iframe";
    iframe.src = `https://www.youtube.com/embed/${item.videoId}?autoplay=1&rel=0&modestbranding=1`;
    iframe.allow = "autoplay; encrypted-media; fullscreen";
    iframe.allowFullscreen = true;
    iframe.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:none;z-index:3";
    iframe.onclick = e => e.stopPropagation();
    wrap.appendChild(iframe);
  } else {
    // Mostrar foto normal
    if (img) { img.src = item.url; img.style.display = ""; }
    if (bg)  bg.style.backgroundImage = `url('${item.url}')`;
  }

  document.querySelectorAll(".miniatura").forEach((m,i) => m.classList.toggle("activa", i === fotoActualIdx));
}

// ── LIGHTBOX ──────────────────────────────────────────────────────────────────
function abrirLightbox(idx) {
  if (!fotosGlobal.length) return;
  if (fotosGlobal[idx]?.tipo === "video") return; // vídeo se gestiona con iframe, no lightbox
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
