// Se ejecuta antes de cargar la app.
// Si no hay usuario autenticado, redirige a login.html
auth.onAuthStateChanged((user) => {
  if (!user) {
    location.replace('login.html');
  } else {
    // Guarda el uid para usarlo en data.js
    window.__uid = user.uid;
    window.__displayName = user.displayName || user.email;
    document.dispatchEvent(new Event('authReady'));
  }
});
