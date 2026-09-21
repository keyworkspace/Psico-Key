const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = 'cambia-esta-clave-en-produccion';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// "Base de datos" en memoria (reemplaza con MongoDB/PostgreSQL en producción)
const usuarios = [];
const citas = [];
const psicologos = [
  { id: 1, nombre: 'Dra. Laura Méndez', especialidad: 'Ansiedad y estrés', precio: 50, avatar: '👩‍⚕️' },
  { id: 2, nombre: 'Dr. Carlos Ruiz', especialidad: 'Terapia de pareja', precio: 60, avatar: '👨‍⚕️' },
  { id: 3, nombre: 'Dra. Ana Torres', especialidad: 'Depresión', precio: 55, avatar: '👩‍⚕️' },
  { id: 4, nombre: 'Dr. Miguel Ángel', especialidad: 'Terapia infantil', precio: 45, avatar: '👨‍⚕️' }
];

// --- Autenticación ---
app.post('/api/register', async (req, res) => {
  const { nombre, email, password } = req.body;
  if (!nombre || !email || !password) return res.status(400).json({ error: 'Faltan datos' });
  if (usuarios.find(u => u.email === email)) return res.status(400).json({ error: 'Email ya registrado' });

  const hash = await bcrypt.hash(password, 10);
  const user = { id: usuarios.length + 1, nombre, email, password: hash };
  usuarios.push(user);

  const token = jwt.sign({ id: user.id, email }, SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, nombre, email } });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = usuarios.find(u => u.email === email);
  if (!user) return res.status(400).json({ error: 'Credenciales inválidas' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: 'Credenciales inválidas' });

  const token = jwt.sign({ id: user.id, email }, SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, nombre: user.nombre, email } });
});

// Middleware de autenticación
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// --- Psicólogos ---
app.get('/api/psicologos', (req, res) => res.json(psicologos));

// --- Citas ---
app.post('/api/citas', auth, (req, res) => {
  const { psicologoId, fecha, hora, motivo } = req.body;
  const psicologo = psicologos.find(p => p.id === psicologoId);
  if (!psicologo) return res.status(404).json({ error: 'Psicólogo no encontrado' });

  const cita = {
    id: citas.length + 1,
    userId: req.user.id,
    psicologo,
    fecha, hora, motivo,
    estado: 'pendiente',
    createdAt: new Date()
  };
  citas.push(cita);
  res.json(cita);
});

app.get('/api/citas', auth, (req, res) => {
  res.json(citas.filter(c => c.userId === req.user.id));
});

app.delete('/api/citas/:id', auth, (req, res) => {
  const idx = citas.findIndex(c => c.id == req.params.id && c.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'No encontrada' });
  citas.splice(idx, 1);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`✅ Servidor en http://localhost:${PORT}`));
