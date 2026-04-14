// ficha.js — Lógica de la ficha individual de un coche
const API = "https://anantacars-production.up.railway.app";
const WA  = "34600000000"; // número de WhatsApp del negocio

function formatPrecio(n) {
  return new Intl.NumberFormat("es-ES", { style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(n);
}
function formatKm(n) {
  return new Intl.NumberFormat("es-ES").format(n) + " km";
}
function estadoClase(e) {
  return { disponible:"estado-disponible", reservado:"estado-reservado", vendido:"estado-vendido" }[e] || "estado-disponible";
}
function estadoTxt(e) {
  return { disponible:"Disponible", reservado:"Reservado", vendido:"Vendido" }[e] || e;
}

function youtubeEmbedUrl(url) {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

function cambiarFoto(url, miniaturas) {
  const img = document.getElementById("foto-main");
  const bg  = document.getElementById("foto-bg");
  if (img) img.src = url;
  if (bg)  bg.style.backgroundImage = `url('${url}')`;
  miniaturas.forEach(m => m.classList.remove("activa"));
}

async function cargarFicha() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    window.location = "index.html";
    return;
  }

  const wrap = document.getElementById("ficha-wrap");

  try {
    // Cargar datos del coche y sus fotos en paralelo
    const [respCoche, respFotos] = await Promise.all([
      fetch(`${API}/api/coches/${id}`),
      fetch(`${API}/api/fotos/${id}`),
    ]);

    const c = await respCoche.json();
    const fotos = await respFotos.json();

    // Actualizar título de la página (SEO)
    document.title = `${c.marca} ${c.modelo} ${c.anio} — ${formatPrecio(c.precio)} | Ananta Cars`;

    const fotoPortada = fotos[0]?.url || null;
    const embedYT = youtubeEmbedUrl(c.video_youtube);

    const miniaturasHTML = fotos.length > 1
      ? fotos.map((f, i) => `<div class="miniatura ${i===0?"activa":""}" data-url="${f.url}"><img src="${f.url}" alt="Foto ${i+1}"/></div>`).join("")
      : "";

    wrap.innerHTML = `
      <!-- GALERÍA -->
      <div class="galeria">
        <div class="foto-principal" id="foto-principal-wrap">
          ${fotoPortada
            ? `<div class="foto-bg-principal" style="background-image:url('${fotoPortada}')" id="foto-bg"></div>
               <img src="${fotoPortada}" alt="${c.marca} ${c.modelo}" id="foto-main"/>`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:4rem;opacity:0.2;position:relative;z-index:1">🚗</div>`
          }
        </div>
        ${miniaturasHTML ? `<div class="miniaturas">${miniaturasHTML}</div>` : ""}
      </div>

      <!-- LAYOUT -->
      <div class="ficha-layout">
        <div>
          <p class="ficha-marca">${c.marca}</p>
          <h1 class="ficha-titulo">${c.modelo}</h1>
          <p class="ficha-anio">${c.anio} · ${c.carroceria} · ${c.color || ""}</p>

          <!-- DATOS -->
          <div class="ficha-datos">
            <div class="dato-fila">
              <span class="dato-fila-label">Kilómetros</span>
              <span class="dato-fila-valor">${formatKm(c.km)}</span>
            </div>
            <div class="dato-fila">
              <span class="dato-fila-label">Combustible</span>
              <span class="dato-fila-valor">${c.combustible}</span>
            </div>
            <div class="dato-fila">
              <span class="dato-fila-label">Cambio</span>
              <span class="dato-fila-valor">${c.caja}</span>
            </div>
            ${c.cv ? `<div class="dato-fila"><span class="dato-fila-label">Potencia</span><span class="dato-fila-valor">${c.cv} CV</span></div>` : ""}
          </div>

          ${c.descripcion ? `<p class="descripcion">${c.descripcion}</p>` : ""}

          ${embedYT ? `
          <div class="video-wrap">
            <h3>Vídeo del vehículo</h3>
            <iframe class="video-embed" src="${embedYT}" allowfullscreen loading="lazy"></iframe>
          </div>` : ""}
        </div>

        <!-- SIDEBAR -->
        <div class="sidebar">
          <span class="sidebar-estado ${estadoClase(c.estado)}">${estadoTxt(c.estado)}</span>
          <div class="sidebar-precio">${formatPrecio(c.precio)}</div>
          ${c.estado !== "vendido" ? `
          <a class="btn-whatsapp" href="https://wa.me/${WA}?text=${encodeURIComponent(`Hola, me interesa el ${c.marca} ${c.modelo} ${c.anio} por ${formatPrecio(c.precio)}`)}">
            📱 Contactar por WhatsApp
          </a>
          <a class="btn-llamar" href="tel:+${WA}">📞 Llamar</a>
          ` : `<p style="color:var(--gris-texto);font-size:0.9rem">Este vehículo ya ha sido vendido.</p>`}
          <p class="sidebar-aviso">Precio al contado. Consulta financiación disponible.</p>
        </div>
      </div>`;

    // Eventos miniaturas
    document.querySelectorAll(".miniatura").forEach(m => {
      m.addEventListener("click", () => {
        cambiarFoto(m.dataset.url, document.querySelectorAll(".miniatura"));
        m.classList.add("activa");
      });
    });

  } catch (err) {
    wrap.innerHTML = `<div class="cargando">No se pudo cargar la ficha. <a href="index.html" style="color:var(--rojo)">Volver al catálogo</a></div>`;
    console.error(err);
  }
}

cargarFicha();
