/**
 * js/cookies-banner.js — Banner de consentimiento de cookies GDPR/LOPDGDD
 * Se auto-inyecta al cargarse. Controlado por localStorage "ac_cookies".
 * Valores: "all" | "essential"
 */
(function () {
  const KEY = "ac_cookies";
  const consent = localStorage.getItem(KEY);

  // Si ya hay consentimiento, activar Analytics si procede y salir
  if (consent) {
    if (consent === "all") _activarAnalytics();
    return;
  }

  // Inyectar estilos
  const style = document.createElement("style");
  style.textContent = `
    #ac-cookies-banner {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;
      background: #141414; border-top: 1px solid #333;
      padding: 16px 5vw; display: flex; align-items: center;
      justify-content: space-between; gap: 16px; flex-wrap: wrap;
      font-family: 'Barlow', sans-serif; font-size: 0.82rem; color: #888;
      box-shadow: 0 -4px 24px rgba(0,0,0,0.5);
      animation: acSlideUp 0.3s ease;
    }
    @keyframes acSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    #ac-cookies-banner a { color: #e8311a; text-decoration: none; }
    #ac-cookies-banner a:hover { text-decoration: underline; }
    .ac-cookies-btns { display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }
    .ac-btn-all {
      background: #e8311a; color: #fff;
      font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
      font-size: 0.82rem; letter-spacing: 0.08em; text-transform: uppercase;
      padding: 8px 18px; border: none; border-radius: 4px; cursor: pointer;
      transition: opacity 0.2s;
    }
    .ac-btn-all:hover { opacity: 0.88; }
    .ac-btn-essential {
      background: transparent; color: #888;
      font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
      font-size: 0.82rem; letter-spacing: 0.08em; text-transform: uppercase;
      padding: 8px 14px; border: 1px solid #333; border-radius: 4px; cursor: pointer;
      transition: all 0.2s;
    }
    .ac-btn-essential:hover { color: #f5f5f0; border-color: #888; }
    @media (max-width: 600px) {
      #ac-cookies-banner { flex-direction: column; align-items: flex-start; }
      .ac-cookies-btns { width: 100%; }
      .ac-btn-all, .ac-btn-essential { flex: 1; text-align: center; }
    }
  `;
  document.head.appendChild(style);

  // Inyectar banner
  const banner = document.createElement("div");
  banner.id = "ac-cookies-banner";
  banner.innerHTML = `
    <p style="margin:0;flex:1;min-width:200px">
      Usamos <strong style="color:#f5f5f0">cookies técnicas</strong> propias para el funcionamiento básico de la web, y cookies de <strong style="color:#f5f5f0">analítica</strong> (Google Analytics) solo si las aceptas. Puedes consultar nuestra
      <a href="/politica-privacidad">Política de Privacidad</a>.
    </p>
    <div class="ac-cookies-btns">
      <button class="ac-btn-essential" onclick="acCookies('essential')">Solo esenciales</button>
      <button class="ac-btn-all" onclick="acCookies('all')">Aceptar todo</button>
    </div>
  `;
  document.body.appendChild(banner);

  // Exponer función global para los botones
  window.acCookies = function (tipo) {
    localStorage.setItem(KEY, tipo);
    document.getElementById("ac-cookies-banner")?.remove();
    if (tipo === "all") _activarAnalytics();
  };

  function _activarAnalytics() {
    // Buscar el ID de Analytics en config ya cargada, o esperar a que cargue
    const activar = (id) => {
      if (!id || document.getElementById("ac-ga-script")) return;
      const s1 = document.createElement("script");
      s1.id = "ac-ga-script";
      s1.async = true;
      s1.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
      document.head.appendChild(s1);
      const s2 = document.createElement("script");
      s2.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${id}');`;
      document.head.appendChild(s2);
    };

    if (window._cfg && typeof window._cfg.then === "function") {
      window._cfg.then(c => activar(c.analytics_id));
    } else {
      // Fallback: leer directo
      fetch("https://anantacars-production.up.railway.app/api/config")
        .then(r => r.json())
        .then(c => activar(c.analytics_id))
        .catch(() => {});
    }
  }
})();
