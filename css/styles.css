// ==============================
//  Base de datos local (localStorage)
// ==============================
const DB = {
  get(key, fallback = []) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
  remove(key) { localStorage.removeItem(key); }
};

// Psicólogos (datos estáticos)
const PSICOLOGOS = [
  { id: 1, nombre: 'Dra. Laura Méndez', especialidad: 'Ansiedad y estrés', precio: 50, avatar: '👩‍⚕️' },
  { id: 2, nombre: 'Dr. Carlos Ruiz', especialidad: 'Terapia de pareja', precio: 60, avatar: '👨‍⚕️' },
  { id: 3, nombre: 'Dra. Ana Torres', especialidad: 'Depresión', precio: 55, avatar: '👩‍⚕️' },
  { id: 4, nombre: 'Dr. Miguel Ángel', especialidad: 'Terapia infantil', precio: 45, avatar: '👨‍⚕️' },
  { id: 5, nombre: 'Dra. Sofía Herrera', especialidad: 'Autoestima', precio: 50, avatar: '👩‍⚕️' },
  { id: 6, nombre: 'Dr. Pablo Vidal', especialidad: 'Duelo y pérdida', precio: 65, avatar: '👨‍⚕️' }
];
