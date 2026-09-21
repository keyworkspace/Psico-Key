// ==========================================
//  Helpers de UI: toast, modal, confirm
// ==========================================

function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 3000);
}

// MODAL
function openModal({ title, body, onSubmit }) {
  const modal = document.getElementById('modal');
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = body;
  modal.classList.remove('hidden');
  modal._onSubmit = onSubmit;
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('modalBody').innerHTML = '';
  document.getElementById('modal')._onSubmit = null;
}

// CONFIRM
function confirmar(msg, onYes, title = '¿Estás seguro?') {
  const el = document.getElementById('confirm');
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent = msg;
  el.classList.remove('hidden');

  const yes = document.getElementById('confirmYes');
  const no = document.getElementById('confirmNo');
  const cleanup = () => { el.classList.add('hidden'); yes.onclick = null; no.onclick = null; };
  yes.onclick = () => { cleanup(); onYes(); };
  no.onclick = cleanup;
}

// Escapes HTML
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// Iniciales para avatar
function iniciales(nombre) {
  return (nombre || '?').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
}

// Eventos globales
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modalClose').onclick = closeModal;
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); document.getElementById('confirm').classList.add('hidden'); }
  });
});
