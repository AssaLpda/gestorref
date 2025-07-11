import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, doc, deleteDoc, setDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// ✅ Tu config Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCZkZQzaKWKdohLeCt_7CNT5krPo6jGrMY",
  authDomain: "base-de-datos-referidos.firebaseapp.com",
  projectId: "base-de-datos-referidos",
  storageBucket: "base-de-datos-referidos.firebasestorage.app",
  messagingSenderId: "533861171122",
  appId: "1:533861171122:web:2378b1b0079316e4416eab"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function unificarReferidoresDuplicados() {
  const snapshot = await getDocs(collection(db, "referidores"));
  const referidoresMap = {};

  // Paso 1: agrupar por ID en minúscula
  snapshot.forEach((docSnap) => {
    const idOriginal = docSnap.id;
    const idLower = idOriginal.toLowerCase();

    if (!referidoresMap[idLower]) {
      referidoresMap[idLower] = [];
    }
    referidoresMap[idLower].push({ id: idOriginal, data: docSnap.data() });
  });

  let cambios = 0;

  // Paso 2: procesar duplicados
  for (const [clave, lista] of Object.entries(referidoresMap)) {
    if (lista.length <= 1) continue; // No hay duplicados

    console.log(`🔧 Unificando duplicados para: ${clave}`);

    let todosReferidos = [];
    let mayorApuesta = 0;

    // Combinar todos los datos
    for (const { data } of lista) {
      todosReferidos = todosReferidos.concat(data.referidos || []);
      if (data.apuesta && data.apuesta > mayorApuesta) {
        mayorApuesta = data.apuesta;
      }
    }

    // Guardar documento único con ID en minúsculas
    await setDoc(doc(db, "referidores", clave), {
      nombre: clave,
      apuesta: mayorApuesta,
      referidos: todosReferidos
    });

    // Eliminar duplicados (excepto el que ya es minúscula)
    for (const { id } of lista) {
      if (id !== clave) {
        await deleteDoc(doc(db, "referidores", id));
        console.log(`🗑️ Eliminado duplicado: ${id}`);
      }
    }

    cambios++;
  }

  if (cambios > 0) {
    alert(`✅ Unificación completada. Se procesaron ${cambios} duplicados.`);
  } else {
    alert("✅ No se encontraron duplicados para unificar.");
  }
}

// Ejecutar
unificarReferidoresDuplicados();
