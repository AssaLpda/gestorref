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

let datosGlobales = [];

async function cargarDatos(filtros = {}) {
  const tbody = document.querySelector("#tablaReferidos tbody");
  tbody.innerHTML = "";

  try {
    const snapshot = await db.collection("referidores").get();
    datosGlobales = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const referidosValidos = data.referidos.filter(r => !r.usoBonificacion && r.carga >= 3000);
      const cargaTotalValida = referidosValidos.reduce((acc, r) => acc + r.carga, 0);
      const participaSorteo = referidosValidos.length >= 5 && data.apuesta >= 1000;

      datosGlobales.push({
        id: doc.id,
        nombre: data.nombre,
        referidosValidos,
        cargaTotalValida,
        apuesta: data.apuesta,
        participaSorteo,
        referidos: data.referidos
      });
    });

    mostrarDatosFiltrados(filtros);
  } catch (error) {
    console.error("Error cargando datos:", error);
    alert("❌ Error al cargar datos desde Firebase");
  }
}

function mostrarDatosFiltrados(filtros) {
  const tbody = document.querySelector("#tablaReferidos tbody");
  tbody.innerHTML = "";

  let lista = datosGlobales;

  if (filtros.nombre) {
    const nombreLower = filtros.nombre.toLowerCase();
    lista = lista.filter(d => d.nombre.toLowerCase().includes(nombreLower));
  }

  if (filtros.sorteo && filtros.sorteo !== "todos") {
    const val = filtros.sorteo === "si";
    lista = lista.filter(d => d.participaSorteo === val);
  }

  if (filtros.minReferidos) {
    const min = parseInt(filtros.minReferidos);
    lista = lista.filter(d => d.referidosValidos.length >= min);
  }

  lista.forEach(data => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${data.nombre}</td>
      <td>${data.referidosValidos.length}</td>
      <td>$${data.cargaTotalValida}</td>
      <td>$${data.apuesta}</td>
      <td class="${data.participaSorteo ? 'ok' : 'not-ok'}">${data.participaSorteo ? "✅ Sí" : "❌ No"}</td>
      <td><button class="btn btn-sm btn-success toggle-btn">Ver</button></td>
    `;

    tbody.appendChild(tr);

    const trDetalle = document.createElement("tr");
    const tdDetalle = document.createElement("td");
    tdDetalle.colSpan = 6;
    tdDetalle.classList.add("hidden");

    let tablaDetalles = `
      <table class="detalle-referidos table table-bordered mb-0">
        <thead class="table-light">
          <tr>
            <th>Usuario referido</th>
            <th>Carga ($)</th>
            <th>Usó bonificación</th>
            <th>Válido para sorteo</th>
            <th>Fecha y hora</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.referidos.forEach(r => {
      const valido = !r.usoBonificacion && r.carga >= 3000;
      tablaDetalles += `
        <tr class="${valido ? "ok" : "not-ok"}">
          <td>${r.usuario}</td>
          <td>$${r.carga}</td>
          <td>${r.usoBonificacion ? "✅ Sí" : "❌ No"}</td>
          <td>${valido ? "✅ Sí" : "❌ No"}</td>
          <td>${r.fecha ? new Date(r.fecha).toLocaleString() : "-"}</td>
        </tr>
      `;
    });

    tablaDetalles += `
        </tbody>
      </table>
    `;

    tdDetalle.innerHTML = tablaDetalles;
    trDetalle.appendChild(tdDetalle);
    tbody.appendChild(trDetalle);

    const btnToggle = tr.querySelector(".toggle-btn");
    btnToggle.addEventListener("click", () => {
      tdDetalle.classList.toggle("hidden");
      btnToggle.textContent = tdDetalle.classList.contains("hidden") ? "Ver" : "Ocultar";
    });
  });
}

async function agregarReferido() {
  const referidorOriginal = document.getElementById("inputReferidor").value.trim();
  const usuarioOriginal = document.getElementById("inputUsuario").value.trim();
  const carga = parseInt(document.getElementById("inputCarga").value);
  const usoBonificacion = document.getElementById("inputUsoBonificacion").value === "true";
  const apuesta = parseInt(document.getElementById("inputApuesta").value);

  const referidor = referidorOriginal.toLowerCase();
  const usuarioKey = usuarioOriginal.toLowerCase();

  if (!referidor || !usuarioKey || isNaN(carga) || isNaN(apuesta)) {
    alert("Por favor completá todos los campos correctamente.");
    return;
  }

  try {
    // Validar si el referido ya fue registrado por otro referidor
    const snapshot = await db.collection("referidores").get();
    let yaExiste = false;
    let referidorExistente = null;
    let fechaExistente = null;

    snapshot.forEach(doc => {
      const data = doc.data();
      const encontrado = (data.referidos || []).find(r => r.usuarioKey === usuarioKey);
      if (encontrado) {
        yaExiste = true;
        referidorExistente = doc.id;
        fechaExistente = encontrado.fecha;
      }
    });

    if (yaExiste) {
      alert(`⚠️ El usuario "${usuarioOriginal}" ya fue referido por "${referidorExistente}" el ${new Date(fechaExistente).toLocaleString()}.`);
      return;
    }

    const docRef = db.collection("referidores").doc(referidor);
    const docSnap = await docRef.get();

    let referidosActuales = [];
    let apuestaActual = apuesta;

    if (docSnap.exists) {
      const data = docSnap.data();
      referidosActuales = data.referidos || [];
      apuestaActual = apuesta > (data.apuesta || 0) ? apuesta : data.apuesta;
    }

    referidosActuales.push({
      usuario: usuarioOriginal,
      usuarioKey: usuarioKey,
      carga,
      usoBonificacion,
      fecha: new Date().toISOString()
    });

    await docRef.set({
      nombre: referidorOriginal,
      referidos: referidosActuales,
      apuesta: apuestaActual
    }, { merge: true });

    alert("✅ Referido agregado correctamente.");
    cargarDatos();
    document.getElementById("formAgregarReferido").reset();

  } catch (error) {
    console.error("Error al agregar referido:", error);
    alert("❌ Error al agregar referido.");
  }
}

function aplicarFiltros(event) {
  event.preventDefault();

  const nombre = document.getElementById("filtroNombre").value.trim();
  const sorteo = document.getElementById("filtroSorteo").value;
  const minReferidos = document.getElementById("filtroMinReferidos").value;

  cargarDatos({
    nombre,
    sorteo,
    minReferidos
  });
}

function limpiarFiltros() {
  document.getElementById("filtroNombre").value = "";
  document.getElementById("filtroSorteo").value = "todos";
  document.getElementById("filtroMinReferidos").value = "0";
  cargarDatos();
}

window.onload = () => {
  cargarDatos();
  document.getElementById("formAgregarReferido").addEventListener("submit", e => {
    e.preventDefault();
    agregarReferido();
  });
  document.getElementById("formFiltros").addEventListener("submit", aplicarFiltros);
  document.getElementById("btnLimpiar").addEventListener("click", limpiarFiltros);
};
