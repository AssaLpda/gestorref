// Config Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCZkZQzaKWKdohLeCt_7CNT5krPo6jGrMY",
  authDomain: "base-de-datos-referidos.firebaseapp.com",
  projectId: "base-de-datos-referidos",
  storageBucket: "base-de-datos-referidos.firebasestorage.app",
  messagingSenderId: "533861171122",
  appId: "1:533861171122:web:2378b1b0079316e4416eab"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Utils
const getFechaActual = () => new Date().toISOString().split('T')[0];
const getTimestampActual = () => new Date();

function formatearFechaHora24(fecha) {
  const dia = fecha.toLocaleDateString("es-AR");
  const hora = fecha.toLocaleTimeString("es-AR", {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  return `${dia} ${hora}`;
}

// DOM Elements
const formCarga = document.getElementById("formCarga");
const usuarioInput = document.getElementById("usuario");
const montoInput = document.getElementById("monto");
const bonificacionInput = document.getElementById("bonificacion");
const bonifReferidoInput = document.getElementById("bonifReferido");
const buscarHistorialBtn = document.getElementById("buscarHistorialBtn");
const usuarioBusquedaInput = document.getElementById("usuarioBusqueda");
const resultadoHistorialDiv = document.getElementById("resultadoHistorial");

const modalHistorial = document.getElementById("modalHistorial");
const contenidoModalHistorial = document.getElementById("contenidoModalHistorial");
const cerrarModalBtn = document.getElementById("cerrarModal");

const tablaCargas = document.getElementById("tablaCargas");
const totalCargas = document.getElementById("totalCargas");
const contenedorPaginacion = document.getElementById("contenedorPaginacion");

const filtroFechaInput = document.getElementById("filtroFecha");
const filtroTurnoSelect = document.getElementById("filtroTurno");

// Estado
let cargas = [];
let paginaActual = 1;
const registrosPorPagina = 10;
let filtroUsuario = "";

// Cargar cargas según fecha
async function cargarCargasPorFecha(fecha) {
  if (!fecha) fecha = getFechaActual();
  filtroFechaInput.value = fecha;

  const snapshot = await db.collection("cargas")
    .orderBy("timestamp", "desc")
    .get();

  cargas = snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate()
    }))
    .filter(c => c.fecha === fecha);

  paginaActual = 1;
  renderTabla();
}

// Filtro por turno horario
function estaEnTurno(timestamp, turno) {
  const hora = timestamp.getHours();
  switch (turno) {
    case "turno1": return (hora >= 2 && hora < 10);
    case "turno2": return (hora >= 10 && hora < 18);
    case "turno3": return (hora >= 18 || hora < 2);
    default: return true;
  }
}

// Render de tabla
function renderTabla() {
  tablaCargas.innerHTML = "";

  const cargasFiltradas = cargas.filter(c =>
    c.usuario.toLowerCase().includes(filtroUsuario.toLowerCase()) &&
    estaEnTurno(c.timestamp, filtroTurnoSelect.value)
  );

  const totalPaginas = Math.ceil(cargasFiltradas.length / registrosPorPagina);
  if (paginaActual > totalPaginas) paginaActual = totalPaginas;
  if (paginaActual < 1) paginaActual = 1;

  const inicio = (paginaActual - 1) * registrosPorPagina;
  const fin = inicio + registrosPorPagina;
  const paginaCargas = cargasFiltradas.slice(inicio, fin);

  paginaCargas.forEach(carga => {
    const montoBonificado = carga.monto * (carga.bonificacion ? carga.bonificacion / 100 : 0);
    tablaCargas.appendChild(crearFilaCarga(carga, montoBonificado));
  });

  const total = cargasFiltradas.reduce((acc, c) => acc + c.monto, 0);
  totalCargas.textContent = total.toLocaleString();

  const totalBonif = cargasFiltradas.reduce((acc, c) => {
    const bonifPorcentaje = c.monto * (c.bonificacion ? c.bonificacion / 100 : 0);
    const bonifReferido = c.bonifReferido ? 3000 : 0;
    return acc + bonifPorcentaje + bonifReferido;
  }, 0);
  document.getElementById("totalBonificaciones").textContent = totalBonif.toLocaleString();

  renderPaginacion(totalPaginas);
}

// Crear fila para la tabla
function crearFilaCarga(carga, montoBonificado) {
  const fila = document.createElement("tr");

  const bonifReferidoBadge = carga.bonifReferido
    ? `<span class="ml-2 px-2 py-1 text-yellow-900 bg-yellow-400 rounded font-semibold text-xs">+ $3000 (Referido)</span>`
    : "";

  fila.innerHTML = `
    <td class="p-3">${carga.usuario}</td>
    <td class="p-3">
      $${carga.monto.toLocaleString()}
      ${montoBonificado > 0 ? `<span class="ml-2 px-2 py-1 text-yellow-900 bg-yellow-300 rounded font-semibold text-sm">+ $${montoBonificado.toLocaleString()} (Bonif. ${carga.bonificacion}%)</span>` : ""}
      ${bonifReferidoBadge}
    </td>
    <td class="p-3">${formatearFechaHora24(carga.timestamp)}</td>
  `;
  return fila;
}

// Paginación
function renderPaginacion(totalPaginas) {
  contenedorPaginacion.innerHTML = "";

  const btnPrev = document.createElement("button");
  btnPrev.textContent = "« Anterior";
  btnPrev.disabled = paginaActual === 1;
  btnPrev.className = btnPrev.disabled
    ? "px-3 py-1 bg-gray-600 rounded cursor-not-allowed"
    : "px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white cursor-pointer";
  btnPrev.addEventListener("click", () => {
    if (paginaActual > 1) {
      paginaActual--;
      renderTabla();
    }
  });
  contenedorPaginacion.appendChild(btnPrev);

  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = i === paginaActual
      ? "px-3 py-1 bg-blue-800 rounded text-white font-bold"
      : "px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white cursor-pointer";
    btn.addEventListener("click", () => {
      paginaActual = i;
      renderTabla();
    });
    contenedorPaginacion.appendChild(btn);
  }

  const btnNext = document.createElement("button");
  btnNext.textContent = "Siguiente »";
  btnNext.disabled = paginaActual === totalPaginas || totalPaginas === 0;
  btnNext.className = btnNext.disabled
    ? "px-3 py-1 bg-gray-600 rounded cursor-not-allowed"
    : "px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white cursor-pointer";
  btnNext.addEventListener("click", () => {
    if (paginaActual < totalPaginas) {
      paginaActual++;
      renderTabla();
    }
  });
  contenedorPaginacion.appendChild(btnNext);
}

// Registrar carga
formCarga.addEventListener("submit", async (e) => {
  e.preventDefault();
  const usuario = usuarioInput.value.trim();
  const monto = parseFloat(montoInput.value);
  const bonificacion = parseInt(bonificacionInput.value, 10) || 0;
  const bonifReferido = bonifReferidoInput.checked;
  const fecha = getFechaActual();
  const timestamp = getTimestampActual();

  if (!usuario || isNaN(monto) || monto <= 0) {
    alert("Por favor ingresa usuario y monto válidos.");
    return;
  }

  await db.collection("cargas").add({
    usuario,
    monto,
    bonificacion,
    bonifReferido,
    fecha,
    timestamp
  });

  formCarga.reset();
  cargarCargasPorFecha(filtroFechaInput.value);
});

// Filtros
filtroFechaInput.addEventListener("change", () => cargarCargasPorFecha(filtroFechaInput.value));
filtroTurnoSelect.addEventListener("change", () => {
  paginaActual = 1;
  renderTabla();
});

// Modal
function abrirModal() {
  modalHistorial.classList.remove("hidden");
}
function cerrarModal() {
  modalHistorial.classList.add("hidden");
}
cerrarModalBtn.addEventListener("click", cerrarModal);
modalHistorial.addEventListener("click", (e) => {
  if (e.target === modalHistorial) cerrarModal();
});

// Buscar historial unificado
buscarHistorialBtn.addEventListener("click", async () => {
  const usuarioBuscado = usuarioBusquedaInput.value.trim();
  if (!usuarioBuscado) {
    alert("Por favor ingresa un usuario para buscar.");
    return;
  }

  contenidoModalHistorial.innerHTML = "Buscando historial...";

  try {
    const [cargasSnap, pagosSnap] = await Promise.all([
      db.collection("cargas").where("usuario", "==", usuarioBuscado).get(),
      db.collection("pagos").where("usuario", "==", usuarioBuscado).get()
    ]);

    const movimientos = [];

    cargasSnap.forEach(doc => {
      const data = doc.data();
      movimientos.push({
        tipo: "carga",
        monto: data.monto,
        bonificacion: data.bonificacion,
        bonifReferido: data.bonifReferido,
        timestamp: data.timestamp.toDate()
      });
    });

    pagosSnap.forEach(doc => {
      const data = doc.data();
      movimientos.push({
        tipo: "retiro",
        monto: data.monto,
        timestamp: data.timestamp.toDate()
      });
    });

    movimientos.sort((a, b) => b.timestamp - a.timestamp);

    let html = `<h3 class="font-semibold mb-2">Historial de movimientos para <strong>${usuarioBuscado}</strong>:</h3>`;
    html += `<ul class="list-disc list-inside max-h-64 overflow-auto text-sm">`;

    movimientos.forEach(mov => {
      const fechaHora = formatearFechaHora24(mov.timestamp);

      if (mov.tipo === "carga") {
        const bonif = mov.bonificacion ? mov.monto * (mov.bonificacion / 100) : 0;
        const bonoRef = mov.bonifReferido ? 3000 : 0;
        let bonifTexto = "";
        if (bonif > 0) bonifTexto += ` + <span class="text-yellow-400">Bonif. $${bonif.toLocaleString()}</span>`;
        if (bonoRef > 0) bonifTexto += ` + <span class="text-yellow-400">Bonif. Referido $${bonoRef.toLocaleString()}</span>`;
        html += `<li>${fechaHora} - $${mov.monto.toLocaleString()}${bonifTexto}</li>`;
      } else {
        html += `<li class="text-red-400">${fechaHora} - RETIRO: $${mov.monto.toLocaleString()}</li>`;
      }
    });

    html += `</ul>`;
    contenidoModalHistorial.innerHTML = html;
    abrirModal();
  } catch (err) {
    console.error("Error:", err);
    contenidoModalHistorial.innerHTML = `<p class="text-red-500">Error al obtener historial.</p>`;
    abrirModal();
  }
});

// Inicializar
cargarCargasPorFecha(filtroFechaInput.value);
