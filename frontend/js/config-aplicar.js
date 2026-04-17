/**
 * js/config-aplicar.js — Aplica configuración global en todas las páginas
 * Incluir con <script src="/js/config-aplicar.js"></script> antes de </body>
 * Expone window._cfg (promise) para que otros scripts puedan reutilizarla
 */
(function () {
  const API = "https://anantacars-production.up.railway.app";

  window._cfg = fetch(`${API}/api/config`)
    .then(r => r.json())
    .then(c => {
      // ── Modo mantenimiento ─────────────────────────────────────────────────
      // No redirigir si ya estamos en mantenimiento o en el panel
      const esPaginas = ["/mantenimiento", "/panel"].every(p => !window.location.pathname.startsWith(p));
      if (c.modo_mantenimiento && esPaginas) {
        window.location.href = "/mantenimiento";
        return c;
      }
      _aplicarColor(c.color_acento);
      _aplicarLogo(c.logo_url);
      _aplicarFavicon(c.favicon_url);
      _aplicarWhatsApp(c.whatsapp);
      _aplicarMetaDesc(c.meta_description);
      _aplicarHero(c.hero_titulo, c.hero_subtitulo);
      _aplicarBanner(c.banner_activo, c.banner_texto, c.banner_color);
      _aplicarHeroImagen(c.hero_imagen);
      return c;
    })
    .catch(() => ({}));

  // ── Color de acento ────────────────────────────────────────────────────────
  function _aplicarColor(hex) {
    if (!hex) return;
    document.documentElement.style.setProperty("--rojo", hex);
    document.documentElement.style.setProperty("--rojo-hover", _darken(hex, -22));
  }

  function _darken(hex, amt) {
    const n = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, Math.min(255, (n >> 16) + amt));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
    const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
  }

  // ── Logo ───────────────────────────────────────────────────────────────────
  function _aplicarLogo(url) {
    if (!url) return;
    const src = url + "?v=" + Date.now();
    document.querySelectorAll(".logo-img").forEach(img => (img.src = src));
  }

  // ── Favicon ────────────────────────────────────────────────────────────────
  function _aplicarFavicon(url) {
    if (!url) return;
    ["icon", "shortcut icon", "apple-touch-icon"].forEach(rel => {
      let el = document.querySelector(`link[rel='${rel}']`);
      if (!el) { el = document.createElement("link"); el.rel = rel; document.head.appendChild(el); }
      el.href = url;
    });
  }

  // ── WhatsApp links ─────────────────────────────────────────────────────────
  function _aplicarWhatsApp(num) {
    if (!num) return;
    document.querySelectorAll("a[href*='wa.me']").forEach(a => {
      a.href = a.href.replace(/wa\.me\/\d+/, `wa.me/${num}`);
    });
  }

  // ── Meta description ───────────────────────────────────────────────────────
  function _aplicarMetaDesc(texto) {
    if (!texto) return;
    let el = document.querySelector("meta[name='description']");
    if (!el) { el = document.createElement("meta"); el.name = "description"; document.head.appendChild(el); }
    // Solo sobreescribir si es el genérico por defecto
    const actual = el.getAttribute("content") || "";
    if (!actual || actual.includes("mejores coches") || actual.includes("Ficha de vehículo")) {
      el.setAttribute("content", texto);
    }
  }

  // ── Hero (solo index.html) ─────────────────────────────────────────────────
  function _aplicarHero(titulo, subtitulo) {
    const elTitulo    = document.getElementById("hero-titulo-txt");
    const elSubtitulo = document.getElementById("hero-label-txt");
    if (elTitulo    && titulo)    elTitulo.textContent    = titulo;
    if (elSubtitulo && subtitulo) elSubtitulo.textContent = subtitulo;
  }

  // ── Hero imagen (solo index.html) ─────────────────────────────────────────
  function _aplicarHeroImagen(url) {
    const hero = document.getElementById("hero");
    if (!hero) return;
    if (url) {
      hero.style.backgroundImage = `url('${url}')`;
      hero.classList.add("con-imagen");
    }
  }

  // ── Banner de aviso ────────────────────────────────────────────────────────
  function _aplicarBanner(activo, texto, color) {
    if (!activo || !texto || document.getElementById("banner-aviso")) return;
    const paleta = {
      rojo:    ["#2a0808", "#e8311a", "#ffaaaa"],
      verde:   ["#082a14", "#1a9a50", "#7fffaa"],
      naranja: ["#2a1400", "#d97706", "#fbbf24"],
      azul:    ["#081628", "#2563eb", "#93c5fd"],
    };
    const [bg, borde, txt] = paleta[color] || paleta.naranja;
    const el = document.createElement("div");
    el.id = "banner-aviso";
    el.style.cssText = [
      `background:${bg}`, `border-bottom:1px solid ${borde}`, `color:${txt}`,
      "font-family:'Barlow Condensed',sans-serif", "font-size:0.84rem", "font-weight:600",
      "letter-spacing:0.06em", "padding:9px 5vw", "display:flex",
      "align-items:center", "justify-content:center", "gap:14px",
      "position:relative", "z-index:500",
    ].join(";");
    el.innerHTML = `<span>${texto}</span><button onclick="document.getElementById('banner-aviso').remove()" style="background:none;border:none;color:${txt};cursor:pointer;font-size:1.1rem;opacity:0.5;padding:0 2px;line-height:1" title="Cerrar">✕</button>`;
    document.body.insertBefore(el, document.body.firstChild);
  }
})();
