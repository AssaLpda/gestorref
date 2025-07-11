// Config Firebase (usa tu propia config)
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

// DOM
const formCarga = document.getElementById("formCarga");
const usuarioInput = document.getElementById("usuario");
const montoInput = document.getElementById("monto");
const tablaCargas = document.getElementById("tablaCargas");
const totalCargas = document.getElementById("totalCargas");
const contenedorPaginacion = document.getElementById("contenedorPaginacion");

// Estado
let cargas = [];
let paginaActual = 1;
const registrosPorPagina = 10;
let filtroUsuario = "";

// Cargar cargas del día actual
async function cargarCargasDelDia() {
  const fechaHoy = getFechaActual();

  const snapshot = await db.collection("cargas")
    .orderBy("timestamp", "desc")
    .get();

  cargas = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp.toDate() }))
    .filter(c => c.fecha === fechaHoy);

  paginaActual = 1;
  renderTabla();
}

// Mostrar tabla con paginación y filtro
function renderTabla() {
  tablaCargas.innerHTML = "";

  const cargasFiltradas = cargas.filter(c =>
    c.usuario.toLowerCase().includes(filtroUsuario.toLowerCase())
  );

  const totalPaginas = Math.ceil(cargasFiltradas.length / registrosPorPagina);
  if (paginaActual > totalPaginas) paginaActual = totalPaginas;
  if (paginaActual < 1) paginaActual = 1;

  const inicio = (paginaActual - 1) * registrosPorPagina;
  const fin = inicio + registrosPorPagina;
  const paginaCargas = cargasFiltradas.slice(inicio, fin);

  paginaCargas.forEach(carga => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td class="p-3">${carga.usuario}</td>
      <td class="p-3">$${carga.monto.toLocaleString()}</td>
      <td class="p-3">${carga.timestamp.toLocaleString()}</td>
    `;
    tablaCargas.appendChild(fila);
  });

  // Total acumulado de cargas filtradas (no solo la página)
  const total = cargasFiltradas.reduce((acc, c) => acc + c.monto, 0);
  totalCargas.textContent = total.toLocaleString();

  renderPaginacion(totalPaginas);
}

// Crear controles de paginación
function renderPaginacion(totalPaginas) {
  contenedorPaginacion.innerHTML = "";

  // Anterior
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

  // Números página
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

  // Siguiente
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

// Evento submit para registrar carga nueva
formCarga.addEventListener("submit", async (e) => {
  e.preventDefault();
  const usuario = usuarioInput.value.trim();
  const monto = parseFloat(montoInput.value);
  const fecha = getFechaActual();
  const timestamp = getTimestampActual();

  if (!usuario || isNaN(monto) || monto <= 0) {
    alert("Por favor ingresa usuario y monto válidos.");
    return;
  }

  await db.collection("cargas").add({ usuario, monto, fecha, timestamp });
  formCarga.reset();
  cargarCargasDelDia();
});

// Opcional: si quieres un input filtro para el usuario, lo puedes agregar al HTML y aquí escucharlo para filtrar.
// Por ejemplo: 
// document.getElementById("filtroUsuarioCarga").addEventListener("input", (e) => {
//   filtroUsuario = e.target.value;
//   paginaActual = 1;
//   renderTabla();
// });


// Carga inicial
cargarCargasDelDia();
