let modoRegistro = false;

const tabs = {
  login: document.getElementById('tabLogin'),
  register: document.getElementById('tabRegister')
};

function setModo(esRegistro) {
  modoRegistro = esRegistro;
  tabs.login.classList.toggle('active', !esRegistro);
  tabs.register.classList.toggle('active', esRegistro);
  document.getElementById('grupoNombre').classList.toggle('hidden', !esRegistro);
  document.getElementById('btnSubmit').textContent = esRegistro ? 'Crear cuenta' : 'Entrar';
  document.getElementById('authError').textContent = '';
}

tabs.login.onclick = () => setModo(false);
tabs.register.onclick = () => setModo(true);

// Si ya hay sesión, redirige
auth.onAuthStateChanged((user) => {
  if (user) location.replace('index.html');
});

// Envío del formulario
document.getElementById('formAuth').onsubmit = async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const nombre = document.getElementById('nombre').value.trim();
  const errEl = document.getElementById('authError');
  const btn = document.getElementById('btnSubmit');
  errEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Procesando...';

  try {
    if (modoRegistro) {
      if (!nombre) throw new Error('Ingresa tu nombre');
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: nombre });
      // Crea el documento base del usuario en Firestore
      await db.collection('usuarios').doc(cred.user.uid).set({
        config: {
          nombre,
          especialidad: 'Psicología clínica',
          email,
          telefono: '',
          tarifaBase: 50,
          moneda: '$',
          duracionSesion: 50
        },
        pacientes: [],
        citas: [],
        notas: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }
    location.replace('index.html');
  } catch (err) {
    errEl.textContent = traducirError(err.code || err.message);
    btn.disabled = false;
    btn.textContent = modoRegistro ? 'Crear cuenta' : 'Entrar';
  }
};

// Reset password
document.getElementById('btnReset').onclick = async () => {
  const email = document.getElementById('email').value.trim();
  if (!email) { document.getElementById('authError').textContent = 'Escribe tu correo primero'; return; }
  try {
    await auth.sendPasswordResetEmail(email);
    toast('📧 Te enviamos un correo para restablecer tu contraseña');
  } catch (err) {
    document.getElementById('authError').textContent = traducirError(err.code);
  }
};

function traducirError(code) {
  const map = {
    'auth/email-already-in-use': 'Ese correo ya está registrado',
    'auth/invalid-email': 'Correo inválido',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
    'auth/user-not-found': 'No existe una cuenta con ese correo',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/invalid-credential': 'Correo o contraseña incorrectos',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento.'
  };
  return map[code] || 'Error: ' + code;
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast success';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 3500);
}
