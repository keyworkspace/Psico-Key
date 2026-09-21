// ==========================================
//  "Base de datos" local (localStorage)
//  ⚠️ Todo se guarda en el navegador del usuario.
//     No compartas el dispositivo ni uses datos reales sensibles.
// ==========================================

const DB = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem('mg_' + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },
  set(key, val) { localStorage.setItem('mg_' + key, JSON.stringify(val)); },
  remove(key) { localStorage.removeItem('mg_' + key); }
};

// ============ CONFIGURACIÓN DEL PROFESIONAL ============
const Config = {
  get() {
    return DB.get('config', {
      nombre: 'Lic. [Tu nombre]',
      especialidad: 'Psicología clínica',
      email: '',
      telefono: '',
      tarifaBase: 50,
      moneda: '$',
      duracionSesion: 50
    });
  },
  save(data) { DB.set('config', data); }
};

// ============ PACIENTES ============
const Pacientes = {
  all() { return DB.get('pacientes', []); },
  save(list) { DB.set('pacientes', list); },
  get(id) { return this.all().find(p => p.id === id); },
  add(data) {
    const list = this.all();
    const p = { id: Date.now(), activo: true, createdAt: new Date().toISOString(), ...data };
    list.push(p); this.save(list); return p;
  },
  update(id, data) {
    const list = this.all();
    const i = list.findIndex(p => p.id === id);
    if (i === -1) return null;
    list[i] = { ...list[i], ...data };
    this.save(list); return list[i];
  },
  remove(id) {
    this.save(this.all().filter(p => p.id !== id));
    // también elimina citas y notas asociadas
    Citas.save(Citas.all().filter(c => c.pacienteId !== id));
    Notas.save(Notas.all().filter(n => n.pacienteId !== id));
  }
};

// ============ CITAS ============
const Citas = {
  all() { return DB.get('citas', []); },
  save(list) { DB.set('citas', list); },
  get(id) { return this.all().find(c => c.id === id); },
  add(data) {
    const list = this.all();
    const c = { id: Date.now(), estado: 'programada', pagado: false, ...data };
    list.push(c); this.save(list); return c;
  },
  update(id, data) {
    const list = this.all();
    const i = list.findIndex(c => c.id === id);
    if (i === -1) return null;
    list[i] = { ...list[i], ...data }; this.save(list); return list[i];
  },
  remove(id) { this.save(this.all().filter(c => c.id !== id)); },
  porFecha(fecha) { return this.all().filter(c => c.fecha === fecha && c.estado !== 'cancelada'); },
  porPaciente(pid) { return this.all().filter(c => c.pacienteId === pid); },
  entreFechas(ini, fin) {
    return this.all().filter(c => c.fecha >= ini && c.fecha <= fin && c.estado !== 'cancelada');
  }
};

// ============ NOTAS DE SESIÓN ============
const Notas = {
  all() { return DB.get('notas', []); },
  save(list) { DB.set('notas', list); },
  get(id) { return this.all().find(n => n.id === id); },
  add(data) {
    const list = this.all();
    const n = { id: Date.now(), fecha: new Date().toISOString().split('T')[0], ...data };
    list.push(n); this.save(list); return n;
  },
  update(id, data) {
    const list = this.all();
    const i = list.findIndex(n => n.id === id);
    if (i === -1) return null;
    list[i] = { ...list[i], ...data }; this.save(list); return list[i];
  },
  remove(id) { this.save(this.all().filter(n => n.id !== id)); },
  porPaciente(pid) {
    return this.all()
      .filter(n => n.pacienteId === pid)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }
};

// ============ HELPERS DE FECHAS ============
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
  },
  mismaSemana(dateStr, lunesStr) {
    const fin = this.addDias(lunesStr, 6);
    return dateStr >= lunesStr && dateStr <= fin;
  }
};
