// catalogo.js — Lógica del catálogo público
const API = "https://anantacars-production.up.railway.app"; // cambiar por la URL de Railway

function formatPrecio(n) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}
function formatKm(n) {
  return new Intl.NumberFormat("es-ES").format(n) + " km";
}

function estadoBadge(estado) {
  const map = {
    disponible: ["estado-disponible", "Disponible"],
    reservado:  ["estado-reservado",  "Reservado"],
    vendido:    ["estado-vendido",    "Vendido"],
  };
  const [cls, txt] = map[estado] || ["estado-disponible", estado];
  return `<span class="estado-badge ${cls}">${txt}</span>`;
}

function renderTarjeta(c) {
  const foto = c.foto_portada
    ? `<img src="${c.foto_portada}" alt="${c.marca} ${c.modelo}" loading="lazy"/>`
    : `<div class="tarjeta-foto-placeholder">🚗</div>`;

  return `
    <div class="tarjeta" onclick="window.location='ficha.html?id=${c.id}'">
      <div class="tarjeta-foto">
        ${foto}
        ${estadoBadge(c.estado)}
        ${c.destacado ? '<span class="destacado-badge">⭐ Destacado</span>' : ""}
      </div>
      <div class="tarjeta-info">
        <div class="tarjeta-marca">${c.marca}</div>
        <div class="tarjeta-nombre">${c.modelo} <small style="font-weight:400;color:var(--gris-texto)">${c.anio}</small></div>
        <div class="tarjeta-datos">
          <span class="dato"><span class="dato-icono">⏱</span>${formatKm(c.km)}</span>
          <span class="dato"><span class="dato-icono">⛽</span>${c.combustible}</span>
          ${c.cv ? `<span class="dato"><span class="dato-icono">💨</span>${c.cv} CV</span>` : ""}
          <span class="dato"><span class="dato-icono">⚙️</span>${c.caja}</span>
        </div>
        <div class="tarjeta-footer">
          <span class="tarjeta-precio">${formatPrecio(c.precio)}</span>
          <a class="btn-ver" href="ficha.html?id=${c.id}">Ver ficha →</a>
        </div>
      </div>
    </div>`;
}

async function buscar() {
  const grid = document.getElementById("grid-coches");
  const contador = document.getElementById("contador-txt");

  // Recoger filtros
  const params = new URLSearchParams();
  const marca      = document.getElementById("f-marca").value.trim();
  const combustible = document.getElementById("f-combustible").value;
  const carroceria  = document.getElementById("f-carroceria").value;
  const precio     = document.getElementById("f-precio").value;
  const km         = document.getElementById("f-km").value;
  const estado     = document.getElementById("f-estado").value;

  if (marca)       params.set("marca", marca);
  if (combustible) params.set("combustible", combustible);
  if (carroceria)  params.set("carroceria", carroceria);
  if (precio)      params.set("precio_max", precio);
  if (km)          params.set("km_max", km);
  if (estado)      params.set("estado", estado);

  grid.innerHTML = `
    <div class="tarjeta"><div class="tarjeta-foto skeleton"></div></div>
    <div class="tarjeta"><div class="tarjeta-foto skeleton"></div></div>
    <div class="tarjeta"><div class="tarjeta-foto skeleton"></div></div>`;
  contador.innerHTML = "Buscando...";

  try {
    const resp = await fetch(`${API}/api/coches?${params}`);
    const coches = await resp.json();

    if (!coches.length) {
      grid.innerHTML = `
        <div class="vacio">
          <div class="vacio-icono">🔍</div>
          <p>No hay coches con esos filtros. Prueba a ampliar la búsqueda.</p>
        </div>`;
      contador.innerHTML = "0 resultados";
      return;
    }

    grid.innerHTML = coches.map(renderTarjeta).join("");
    contador.innerHTML = `<strong>${coches.length}</strong> vehículo${coches.length !== 1 ? "s" : ""} encontrado${coches.length !== 1 ? "s" : ""}`;

  } catch (err) {
    grid.innerHTML = `<div class="vacio"><p>Error al cargar el catálogo. Inténtalo de nuevo.</p></div>`;
    contador.innerHTML = "Error de conexión";
    console.error(err);
  }
}

function resetFiltros() {
  document.getElementById("f-marca").value = "";
  document.getElementById("f-combustible").value = "";
  document.getElementById("f-carroceria").value = "";
  document.getElementById("f-precio").value = "";
  document.getElementById("f-km").value = "";
  document.getElementById("f-estado").value = "disponible";
  buscar();
}

// Buscar al cargar y al pulsar Enter en inputs de texto
document.addEventListener("DOMContentLoaded", buscar);
document.getElementById("f-marca")?.addEventListener("keydown", e => e.key === "Enter" && buscar());
document.getElementById("f-precio")?.addEventListener("keydown", e => e.key === "Enter" && buscar());
document.getElementById("f-km")?.addEventListener("keydown", e => e.key === "Enter" && buscar());
