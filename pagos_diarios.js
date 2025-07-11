// Configuración Firebase
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

// Utilidades
const getFechaActual = () => new Date().toISOString().split('T')[0];
const getMesActual = () => new Date().toISOString().slice(0, 7);
const getTimestampActual = () => new Date();

// Formatear fecha y hora para mostrar en tabla y PDF
function formatoFechaHora(date) {
  return date.toLocaleString('es-AR', { 
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
}

// DOM
const formPago = document.getElementById("formPago");
const usuarioInput = document.getElementById("usuario");
const montoInput = document.getElementById("monto");
const notaInput = document.getElementById("nota");
const tablaPagos = document.getElementById("tablaPagos");
const totalPagos = document.getElementById("totalPagos");
const descargarCSV = document.getElementById("descargarCSV");
const filtroUsuario = document.getElementById("filtroUsuario");

// NUEVO: DOM para consulta disponible
const buscadorUsuarioDisponible = document.getElementById("buscadorUsuarioDisponible");
const btnConsultarDisponible = document.getElementById("btnConsultarDisponible");
const resultadoDisponible = document.getElementById("resultadoDisponible");

// Estado
let pagos = [];
let paginaActual = 1;
const registrosPorPagina = 10;
let filtroActual = "";

// Crear contenedor para la paginación
const contenedorPaginacion = document.createElement('div');
contenedorPaginacion.className = "flex justify-center gap-2 mt-4";
tablaPagos.parentNode.after(contenedorPaginacion);

// Cargar todos los pagos del mes
async function cargarPagosDelMes() {
  const mesActual = getMesActual(); // formato YYYY-MM
  const snapshot = await db.collection("pagos")
    .orderBy("timestamp", "desc")
    .get();

  pagos = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp.toDate() }))
    .filter(p => p.fecha.startsWith(mesActual));

  paginaActual = 1; // reset paginación al recargar datos
  renderTabla();
}

// Filtrar por usuario
filtroUsuario.addEventListener("input", () => {
  filtroActual = filtroUsuario.value.trim().toLowerCase();
  paginaActual = 1;
  renderTabla();
});

// Mostrar pagos en la tabla con paginación
function renderTabla() {
  tablaPagos.innerHTML = "";

  const pagosFiltrados = pagos.filter(p =>
    p.usuario.toLowerCase().includes(filtroActual)
  );

  // Calcular la cantidad total de páginas
  const totalPaginas = Math.ceil(pagosFiltrados.length / registrosPorPagina);

  // Limitar paginaActual si está fuera de rango
  if (paginaActual > totalPaginas) paginaActual = totalPaginas;
  if (paginaActual < 1) paginaActual = 1;

  // Calcular índices para slice
  const inicio = (paginaActual - 1) * registrosPorPagina;
  const fin = inicio + registrosPorPagina;
  const paginaPagos = pagosFiltrados.slice(inicio, fin);

  // Mostrar filas
  paginaPagos.forEach(pago => {
    const retiros24h = contarRetirosUltimas24h(pago.usuario);
    const bloqueado = retiros24h >= 3;

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td class="p-3 ${bloqueado ? 'text-red-500 font-bold' : ''}">${pago.usuario}</td>
      <td class="p-3">$${pago.monto.toLocaleString()}</td>
      <td class="p-3">${formatoFechaHora(pago.timestamp)}</td>
      <td class="p-3">
        ${pago.nota || ""}
        ${bloqueado ? `<br><span class="text-red-400 font-semibold">⛔ Bloqueado. Esperar ${tiempoRestanteParaRetiro(pago.usuario)}</span>` : ''}
      </td>
      <td class="p-3">
        <button class="text-blue-400 hover:text-blue-200" onclick="editarPago('${pago.id}')">
          <i class="bi bi-pencil-square"></i> Editar
        </button>
      </td>
    `;
    tablaPagos.appendChild(fila);
  });

  // Mostrar total general de TODOS los pagos filtrados (no solo los de la página actual)
  const totalGeneral = pagosFiltrados.reduce((acc, p) => acc + p.monto, 0);
  totalPagos.textContent = totalGeneral.toLocaleString();

  // Renderizar controles de paginación
  renderPaginacion(totalPaginas);
}

// Función para crear los botones de paginación
function renderPaginacion(totalPaginas) {
  contenedorPaginacion.innerHTML = "";

  // Botón anterior
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

  // Botones numerados
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

  // Botón siguiente
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

// Contar retiros en las últimas 24hs
function contarRetirosUltimas24h(usuario) {
  const ahora = new Date();
  return pagos.filter(p =>
    p.usuario.toLowerCase() === usuario.toLowerCase() &&
    ahora - p.timestamp <= 24 * 60 * 60 * 1000
  ).length;
}

// Calcular tiempo restante para desbloqueo
function tiempoRestanteParaRetiro(usuario, pagosParam = null) {
  const ahora = new Date();
  // Usar pagosParam si está, sino usar pagos global
  const pagosAnalizar = pagosParam || pagos;

  const retirosUsuario = pagosAnalizar
    .filter(p => p.usuario.toLowerCase() === usuario.toLowerCase())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 3); // últimos 3 pagos

  if (retirosUsuario.length < 3) return "0h";

  const primero = retirosUsuario[2].timestamp;
  const tiempoRestanteMs = 24 * 60 * 60 * 1000 - (ahora - primero);

  if (tiempoRestanteMs <= 0) return "0h";

  const horas = Math.floor(tiempoRestanteMs / (1000 * 60 * 60));
  const minutos = Math.floor((tiempoRestanteMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${horas}h ${minutos}m`;
}

// Registrar nuevo pago
formPago.addEventListener("submit", async (e) => {
  e.preventDefault();
  const usuario = usuarioInput.value.trim();
  const monto = parseFloat(montoInput.value);
  const nota = notaInput.value.trim();
  const fecha = getFechaActual();
  const timestamp = getTimestampActual();

  if (!usuario || isNaN(monto)) return;

  const retiros24h = contarRetirosUltimas24h(usuario);
  if (retiros24h >= 3) {
    alert(`⛔ El usuario ${usuario} ya retiró 3 veces en las últimas 24hs.\nDebe esperar: ${tiempoRestanteParaRetiro(usuario)}.`);
    return;
  }

  await db.collection("pagos").add({ usuario, monto, fecha, nota, timestamp });
  formPago.reset();
  cargarPagosDelMes();
});

// Editar un pago
async function editarPago(id) {
  const pago = pagos.find(p => p.id === id);
  const nuevoMonto = prompt("Nuevo monto", pago.monto);
  const nuevaNota = prompt("Editar nota", pago.nota || "");

  if (nuevoMonto && !isNaN(parseFloat(nuevoMonto))) {
    await db.collection("pagos").doc(id).update({
      monto: parseFloat(nuevoMonto),
      nota: nuevaNota
    });
    cargarPagosDelMes();
  }
}

// Descargar PDF con fecha y hora
descargarCSV.addEventListener("click", () => {
  if (pagos.length === 0) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Título
  doc.setFontSize(16);
  doc.text("Pagos - " + getFechaActual(), 14, 20);

  // Encabezados de tabla
  const headers = [["Usuario", "Monto", "Fecha y Hora", "Nota"]];
  const data = pagos.map(p => [
    p.usuario,
    `$${p.monto.toLocaleString()}`,
    formatoFechaHora(p.timestamp),
    p.nota || ""
  ]);

  const startY = 30;
  let y = startY;
  doc.setFontSize(12);

  // Dibujar headers
  headers[0].forEach((header, i) => {
    doc.text(header, 14 + i * 40, y);
  });
  y += 8;

  // Dibujar filas
  data.forEach(row => {
    row.forEach((cell, i) => {
      doc.text(String(cell), 14 + i * 40, y);
    });
    y += 8;
    if (y > 280) { // Salto de página
      doc.addPage();
      y = 20;
    }
  });

  // Calcular total
  const total = pagos.reduce((acc, p) => acc + p.monto, 0);

  // Espacio antes de total
  y += 10;
  if (y > 280) {
    doc.addPage();
    y = 20;
  }

  // Mostrar total
  doc.setFontSize(14);
  doc.setTextColor(0, 128, 0); // verde oscuro
  doc.text(`Total de pagos: $${total.toLocaleString()}`, 14, y);

  // Descargar PDF
  doc.save(`pagos-${getFechaActual()}.pdf`);
});

// --- NUEVO: funciones para consultar disponible con cargas y retiros

async function obtenerCargasUltimas24h(usuario) {
  const ahora = new Date();
  const hace24h = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);

  const snapshot = await db.collection("cargas")
    .where("usuario", "==", usuario)
    .where("timestamp", ">=", hace24h)
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    data.timestamp = data.timestamp.toDate ? data.timestamp.toDate() : data.timestamp;
    return data;
  });
}

async function obtenerRetirosUltimas24h(usuario) {
  const ahora = new Date();
  const hace24h = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);

  const snapshot = await db.collection("pagos")
    .where("usuario", "==", usuario)
    .where("timestamp", ">=", hace24h)
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    data.timestamp = data.timestamp.toDate ? data.timestamp.toDate() : data.timestamp;
    return data;
  });
}

function obtenerTopePorCarga(carga) {
  if (carga >= 1500 && carga <= 14000) return 50000;
  if (carga >= 15000 && carga <= 29000) return 75000;
  if (carga >= 30000 && carga <= 50000) return 100000;
  if (carga >= 51000 && carga <= 75000) return 125000;
  if (carga >= 75000) return "doble"; // mensaje especial
  return 0;
}

function tiempoRestanteParaRetiroConPagos(usuario, pagosParam) {
  const ahora = new Date();
  const retirosUsuario = pagosParam
    .filter(p => p.usuario.toLowerCase() === usuario.toLowerCase())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 3);

  if (retirosUsuario.length < 3) return "0h";

  const primero = retirosUsuario[2].timestamp;
  const tiempoRestanteMs = 24 * 60 * 60 * 1000 - (ahora - primero);

  if (tiempoRestanteMs <= 0) return "0h";

  const horas = Math.floor(tiempoRestanteMs / (1000 * 60 * 60));
  const minutos = Math.floor((tiempoRestanteMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${horas}h ${minutos}m`;
}

async function consultarDisponible(usuario) {
  if (!usuario) return { disponible: 0, bloqueado: false, mensaje: "Usuario inválido" };

  const cargas = await obtenerCargasUltimas24h(usuario);
  const retiros = await obtenerRetirosUltimas24h(usuario);

  const sumaCargas = cargas.reduce((acc, c) => acc + (c.monto || 0), 0);
  const sumaRetiros = retiros.reduce((acc, r) => acc + (r.monto || 0), 0);
  const cantidadRetiros = retiros.length;

  if (cantidadRetiros >= 3) {
    const espera = tiempoRestanteParaRetiroConPagos(usuario, retiros);
    return {
      disponible: 0,
      bloqueado: true,
      mensaje: `⛔ Usuario bloqueado. Debe esperar: ${espera}`
    };
  }

  const tope = obtenerTopePorCarga(sumaCargas);

  if (tope === 0) {
    return {
      disponible: 0,
      bloqueado: false,
      mensaje: "Carga insuficiente para retiro"
    };
  }
  if (tope === "doble") {
    return {
      disponible: "Consultar monto especial",
      bloqueado: false,
      mensaje: ""
    };
  }

  const disponible = tope - sumaRetiros > 0 ? tope - sumaRetiros : 0;

  return {
    disponible,
    bloqueado: false,
    mensaje: ""
  };
}

// Evento para botón consultar disponible
btnConsultarDisponible.addEventListener("click", async () => {
  const usuario = buscadorUsuarioDisponible.value.trim();
  if (!usuario) {
    resultadoDisponible.textContent = "Por favor, ingrese un usuario válido.";
    return;
  }

  resultadoDisponible.textContent = "Calculando...";

  try {
    const resultado = await consultarDisponible(usuario);

    if (resultado.bloqueado) {
      resultadoDisponible.innerHTML = `Disponible para retirar: <span class="text-red-600 font-bold">$0</span><br>${resultado.mensaje}`;
    } else if (resultado.disponible === "Consultar monto especial") {
      resultadoDisponible.innerHTML = `Disponible para retirar: <span class="text-yellow-600 font-bold">${resultado.disponible}</span>`;
    } else if (resultado.disponible === 0) {
      resultadoDisponible.innerHTML = `Disponible para retirar: <span class="text-gray-600 font-bold">$0</span><br>${resultado.mensaje}`;
    } else {
      resultadoDisponible.innerHTML = `Disponible para retirar: <span class="text-green-600 font-bold">$${resultado.disponible.toLocaleString()}</span>`;
    }
  } catch (error) {
    console.error(error);
    resultadoDisponible.textContent = "Error al consultar disponible.";
  }
});

// Iniciar carga
cargarPagosDelMes();









