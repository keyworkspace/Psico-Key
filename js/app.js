// ==============================
//  Utilidades
// ==============================
function toast(msg, err = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (err ? ' err' : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 3000);
}

function scrollToPsicologos() {
  document.getElementById('psicologos').scrollIntoView({ behavior: 'smooth' });
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// Cerrar modales con la X o clic fuera
document.querySelectorAll('[data-close]').forEach(el => {
  el.onclick = () => closeModal(el.dataset.close);
});
document.querySelectorAll('.modal').forEach(m => {
  m.onclick = (e) => { if (e.target === m) m.classList.add('hidden'); };
});

// ==============================
//  Estado global
// ==============================
let modoRegistro = false;
let psicologoSeleccionado = null;

// ==============================
//  Render Psicólogos
// ==============================
function renderPsicologos() {
  const cont = document.getElementById('listaPsicologos');
  cont.innerHTML = PSICOLOGOS.map(p => `
    <div class="card">
      <div class="avatar">${p.avatar}</div>
      <h3>${p.nombre}</h3>
      <div class="esp">${p.especialidad}</div>
      <div class="precio">Desde <strong>$${p.precio}</strong> / sesión</div>
      <button class="btn-primary btn-block" onclick="abrirCita(${p.id})">Reservar</button>
    </div>
  `).join('');
}

// ==============================
//  Modales Auth
// ==============================
function abrirModalAuth(esRegistro) {
  modoRegistro = esRegistro;
  document.getElementById('modalTitle').textContent = esRegistro ? 'Crear cuenta' : 'Iniciar sesión';
  document.getElementById('nombre').classList.toggle('hidden', !esRegistro);
  document.getElementById('nombre').required = esRegistro;
  document.getElementById('authError').textContent = '';
  document.getElementById('authForm').reset();
  openModal('modalAuth');
}

// ==============================
//  Reservar cita
// ==============================
function abrirCita(psicologoId) {
  if (!Auth.isLogged()) {
    toast('Inicia sesión para reservar', true);
    abrirModalAuth(false);
    return;
  }
  const p = PSICOLOGOS.find(x => x.id === psicologoId);
  psicologoSeleccionado = p;
  document.getElementById('psicologoInfo').textContent = `Sesión con ${p.avatar} ${p.nombre}`;
  document.getElementById('citaForm').reset();

  // Fecha mínima = hoy
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('fecha').min = hoy;

  openModal('modalCita');
}

// ==============================
//  Dashboard
// ==============================
function renderDashboard() {
  const user = Auth.getUser();
  if (!user) return;
  document.getElementById('dashboard').classList.remove('hidden');
  const citas = Citas.porUsuario(user.id);
  const cont = document.getElementById('listaCitas');

  if (citas.length === 0) {
    cont.innerHTML = '<p style="color:#666;grid-column:1/-1;text-align:center;">Aún no tienes citas agendadas.</p>';
    return;
  }

  cont.innerHTML = citas.map(c => `
    <div class="card">
      <div class="avatar">${c.psicologo.avatar}</div>
      <h3>${c.psicologo.nombre}</h3>
      <div class="esp">${c.psicologo.especialidad}</div>
      <p><strong>📅</strong> ${c.fecha} · ${c.hora}</p>
      <p><strong>Estado:</strong> <span style="color:#f39c12">${c.estado}</span></p>
      ${c.motivo ? `<p style="font-size:.9rem;color:#666;margin-top:6px;">"${c.motivo}"</p>` : ''}
      <button class="btn-outline btn-block" style="margin-top:12px" onclick="cancelarCita(${c.id})">Cancelar</button>
    </div>
  `).join('');
}

function cancelarCita(id) {
  const user = Auth.getUser();
  if (!user) return;
  if (!confirm('¿Cancelar esta cita?')) return;
  if (Citas.cancelar(id, user.id)) {
    toast('Cita cancelada');
    renderDashboard();
  }
}

// ==============================
//  UI según sesión
// ==============================
function actualizarUI() {
  const logged = Auth.isLogged();
  document.getElementById('btnLogin').classList.toggle('hidden', logged);
  document.getElementById('btnRegister').classList.toggle('hidden', logged);
  document.getElementById('btnLogout').classList.toggle('hidden', !logged);
  document.getElementById('btnDashboard').classList.toggle('hidden', !logged);
  if (!logged) document.getElementById('dashboard').classList.add('hidden');
}

// ==============================
//  Init
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();
  renderPsicologos();
  actualizarUI();
  if (Auth.isLogged()) renderDashboard();

  // Botones nav
  document.getElementById('btnLogin').onclick = () => abrirModalAuth(false);
  document.getElementById('btnRegister').onclick = () => abrirModalAuth(true);
  document.getElementById('btnLogout').onclick = () => {
    Auth.logout();
    toast('Sesión cerrada');
    actualizarUI();
  };
  document.getElementById('btnDashboard').onclick = () => {
    renderDashboard();
    document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
  };

  // Formulario auth
  document.getElementById('authForm').onsubmit = async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const errEl = document.getElementById('authError');
    errEl.textContent = '';

    try {
      if (modoRegistro) {
        if (!nombre) throw new Error('Ingresa tu nombre');
        await Auth.registrar(nombre, email, password);
        toast(`¡Bienvenido/a, ${nombre}!`);
      } else {
        await Auth.login(email, password);
        toast('Sesión iniciada');
      }
      closeModal('modalAuth');
      actualizarUI();
      renderDashboard();
    } catch (err) {
      errEl.textContent = err.message;
    }
  };

  // Formulario cita
  document.getElementById('citaForm').onsubmit = (e) => {
    e.preventDefault();
    const user = Auth.getUser();
    if (!user || !psicologoSeleccionado) return;

    const fecha = document.getElementById('fecha').value;
    const hora = document.getElementById('hora').value;
    const motivo = document.getElementById('motivo').value.trim();

    if (!fecha || !hora) return;
    if (new Date(fecha + 'T' + hora) < new Date()) {
      toast('La fecha debe ser futura', true);
      return;
    }

    Citas.crear(user.id, psicologoSeleccionado, fecha, hora, motivo);
    closeModal('modalCita');
    toast('✅ Cita reservada');
    renderDashboard();
    document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
  };
});
