// ==========================================
//  Datos respaldados en Firestore
//  Estructura: usuarios/{uid}/ → { config, pacientes, citas, notas }
// ==========================================

let CACHE = { config: {}, pacientes: [], citas: [], notas: [] };
let UID = null;
let listo = false;

async function cargarDatos() {
  UID = window.__uid;
  const ref = db.collection('usuarios').doc(UID);
  const snap = await ref.get();
  if (snap.exists) {
    const d = snap.data();
    CACHE.config = d.config || CACHE.config;
    CACHE.pacientes = d.pacientes || [];
    CACHE.citas = d.citas || [];
    CACHE.notas = d.notas || [];
  }
  listo = true;
  document.dispatchEvent(new Event('datosListos'));
}

// Guarda todo el documento (simple y suficiente para un solo psicólogo)
let guardando = false;
async function persistir() {
  if (!UID) return;
  if (guardando) return;
  guardando = true;
  try {
    await db.collection('usuarios').doc(UID).set(CACHE, { merge: true });
  } catch (e) {
    console.error('Error al guardar:', e);
    if (typeof toast === 'function') toast('Error al guardar cambios', 'error');
  } finally {
    guardando = false;
  }
}

// ============ CONFIG ============
const Config = {
  get() { return CACHE.config; },
  save(data) { CACHE.config = { ...CACHE.config, ...data }; persistir(); }
};

// ============ PACIENTES ============
const Pacientes = {
  all() { return CACHE.pacientes; },
  save(list) { CACHE.pacientes = list; persistir(); },
  get(id) { return CACHE.pacientes.find(p => p.id === id); },
  add(data) {
    const p = { id: Date.now(), activo: true, createdAt: new Date().toISOString(), ...data };
    CACHE.pacientes.push(p); persistir(); return p;
  },
  update(id, data) {
    const i = CACHE.pacientes.findIndex(p => p.id === id);
    if (i === -1) return null;
    CACHE.pacientes[i] = { ...CACHE.pacientes[i], ...data };
    persistir(); return CACHE.pacientes[i];
  },
  remove(id) {
    CACHE.pacientes = CACHE.pacientes.filter(p => p.id !== id);
    CACHE.citas = CACHE.citas.filter(c => c.pacienteId !== id);
    CACHE.notas = CACHE.notas.filter(n => n.pacienteId !== id);
    persistir();
  }
};

// ============ CITAS ============
const Citas = {
  all() { return CACHE.citas; },
  save(list) { CACHE.citas = list; persistir(); },
  get(id) { return CACHE.citas.find(c => c.id === id); },
  add(data) {
    const c = { id: Date.now(), estado: 'programada', pagado: false, ...data };
    CACHE.citas.push(c); persistir(); return c;
  },
  update(id, data) {
    const i = CACHE.citas.findIndex(c => c.id === id);
    if (i === -1) return null;
    CACHE.citas[i] = { ...CACHE.citas[i], ...data };
    persistir(); return CACHE.citas[i];
  },
  remove(id) { CACHE.citas = CACHE.citas.filter(c => c.id !== id); persistir(); },
  porFecha(fecha) { return CACHE.citas.filter(c => c.fecha === fecha && c.estado !== 'cancelada'); },
  porPaciente(pid) { return CACHE.citas.filter(c => c.pacienteId === pid); },
  entreFechas(ini, fin) {
    return CACHE.citas.filter(c => c.fecha >= ini && c.fecha <= fin && c.estado !== 'cancelada');
  }
};

// ============ NOTAS ============
const Notas = {
  all() { return CACHE.notas; },
  save(list) { CACHE.notas = list; persistir(); },
  get(id) { return CACHE.notas.find(n => n.id === id); },
  add(data) {
    const n = { id: Date.now(), fecha: new Date().toISOString().split('T')[0], ...data };
    CACHE.notas.push(n); persistir(); return n;
  },
  update(id, data) {
    const i = CACHE.notas.findIndex(n => n.id === id);
    if (i === -1) return null;
    CACHE.notas[i] = { ...CACHE.notas[i], ...data };
    persistir(); return CACHE.notas[i];
  },
  remove(id) { CACHE.notas = CACHE.notas.filter(n => n.id !== id); persistir(); },
  porPaciente(pid) {
    return CACHE.notas.filter(n => n.pacienteId === pid)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }
};

// ============ HELPERS DE FECHAS (sin cambios) ============
const Fecha = {
  hoy() { return new Date().toISOString().split('T')[0]; },
  format(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${parseInt(d)} ${meses[parseInt(m)-1]} ${y}`;
  },
  formatLargo(iso) {
    if (!iso) return '';
    const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    const [y,m,d] = iso.split('-').map(Number);
    const date = new Date(y, m-1, d);
    return `${dias[date.getDay()]}, ${d} de ${['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][m-1]}`;
  },
  lunesDe(dateStr) {
    const [y,m,d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m-1, d);
    const day = dt.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    dt.setDate(dt.getDate() + diff);
    return dt;
  },
  addDias(dateStr, n) {
    const [y,m,d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m-1, d);
    dt.setDate(dt.getDate() + n);
    return dt.toISOString().split('T')[0];
  }
};
