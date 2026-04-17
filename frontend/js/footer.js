/**
 * js/footer.js — Footer dinámico unificado
 * Renderiza el footer desde config en todas las páginas.
 * Requiere: <div id="footer-root"></div> donde quieras el footer.
 * Requiere: redes.js cargado antes (para renderRedesFooter).
 */
(function () {
  const API = "https://anantacars-production.up.railway.app";

  // CSS compartido del footer — se inyecta una sola vez
  const CSS = `
    #footer-root .footer-wrap{border-top:1px solid #333}
    #footer-root footer{max-width:1100px;margin:0 auto;padding:28px 5vw;display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:24px;align-items:start}
    #footer-root .footer-col p{font-size:0.8rem;color:#888;margin-top:5px}
    #footer-root .footer-col a{color:#888;text-decoration:none;transition:color 0.2s}
    #footer-root .footer-col a:hover{color:var(--blanco,#f5f5f0)}
    #footer-root .footer-logo{font-family:'Barlow Condensed',sans-serif;font-size:1.2rem;font-weight:800;color:var(--blanco,#f5f5f0)}
    #footer-root .footer-logo-img{height:32px;width:auto;object-fit:contain;vertical-align:middle;margin-right:8px}
    #footer-root .footer-col-center{text-align:center}
    #footer-root .footer-col-right{display:flex;align-items:center;justify-content:flex-end;gap:14px}
    #footer-root .footer-tel{font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:700;color:var(--blanco,#f5f5f0);text-decoration:none;display:flex;align-items:center;gap:6px;transition:color 0.2s}
    #footer-root .footer-tel:hover{color:var(--rojo,#e8311a)}
    @media(max-width:600px){
      #footer-root footer{grid-template-columns:1fr}
      #footer-root .footer-col-center,#footer-root .footer-col-right{text-align:left;justify-content:flex-start}
    }
  `;

  function inyectarCSS() {
    if (document.getElementById("footer-root-css")) return;
    const s = document.createElement("style");
    s.id = "footer-root-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function renderFooter(cfg) {
    const root = document.getElementById("footer-root");
    if (!root) return;

    const nombre    = cfg.nombre_negocio || "Ananta Cars";
    const logoUrl   = cfg.logo_url || null;
    const anio      = new Date().getFullYear();
    const tel       = cfg.telefono || cfg.whatsapp || null;
    const telFmt    = tel ? "+" + (tel.startsWith("34") ? "34 " + tel.slice(2).replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3") : tel) : null;
    const waNum     = cfg.whatsapp || null;

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" class="footer-logo-img" alt="${nombre}"/>`
      : "";

    root.innerHTML = `
      <div class="footer-wrap">
        <footer>
          <div class="footer-col">
            <div class="footer-logo">${logoHtml}${nombre}</div>
            ${cfg.direccion ? `<p>📍 ${cfg.direccion}</p>` : ""}
            ${cfg.horario   ? `<p>🕐 ${cfg.horario}</p>`   : ""}
            ${telFmt && waNum ? `<a href="https://wa.me/${waNum}" target="_blank" rel="noopener" class="footer-tel" style="margin-top:8px">📱 ${telFmt}</a>` : ""}
            ${telFmt && !waNum ? `<a href="tel:+${tel}" class="footer-tel" style="margin-top:8px">📞 ${telFmt}</a>` : ""}
          </div>
          <div class="footer-col footer-col-center">
            <p>© ${anio} ${nombre}</p>
            <p style="margin-top:6px">
              <a href="/como-comprar">Cómo comprar</a> ·
              <a href="/politica-privacidad">Privacidad</a> ·
              <a href="/aviso-legal">Aviso legal</a>
            </p>
          </div>
          <div class="footer-col footer-col-right" id="footer-redes-root"></div>
        </footer>
      </div>`;

    // Redes sociales
    if (typeof renderRedesFooter === "function") {
      renderRedesFooter(cfg, document.getElementById("footer-redes-root"));
    }
  }

  function init() {
    inyectarCSS();
    // Usar config ya cargada si existe (evita doble fetch)
    if (window._cfg && typeof window._cfg.then === "function") {
      window._cfg.then(cfg => renderFooter(cfg || {}));
    } else {
      fetch(`${API}/api/config`)
        .then(r => r.json())
        .then(cfg => renderFooter(cfg || {}))
        .catch(() => renderFooter({}));
    }
  }

  // Esperar a que el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
