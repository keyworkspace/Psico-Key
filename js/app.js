// ==========================================
//  Router + Vistas
// ==========================================

const VISTAS = {
  dashboard: { titulo: 'Dashboard', sub: 'Resumen de tu consultorio', render: renderDashboard },
  agenda:    { titulo: 'Agenda',    sub: 'Tus sesiones de la semana', render: renderAgenda,    accion: { label: '+ Nueva cita', fn: () => modalCita() } },
  pacientes: { titulo: 'Pacientes', sub: 'Gestiona tus pacientes',     render: renderPacientes, accion: { label: '+ Nuevo paciente', fn: () => modalPaciente() } },
  notas:     { titulo: 'Notas de sesión', sub: 'Registro clínico privado', render: renderNotas,  accion: { label: '+ Nueva nota', fn: () => modalNota() } },
  finanzas:  { titulo: 'Finanzas',  sub: 'Ingresos y pagos',           render: renderFinanzas },
  config:    { titulo: 'Configuración', sub: 'Tus datos profesionales', render: renderConfig }
};

let vistaActual = 'dashboard';

function router() {
  const hash = location.hash.replace('#/', '') || 'dashboard';
  const nombre = VISTAS[hash] ? hash : 'dashboard';
  vistaActual = nombre;

  // Menú activo
  document.querySelectorAll('.menu a').forEach(a =>
    a.classList.toggle('active', a.dataset.view === nombre));

  const v = VISTAS[nombre];
  document.getElementById('viewTitle').textContent = v.titulo;
  document.getElementById('viewSubtitle').textContent = v.sub || '';

  const btn = document.getElementById('btnAccion');
  if (v.accion) {
    btn.textContent = v.accion.label;
    btn.classList.remove('hidden');
    btn.onclick = v.accion.fn;
  } else btn.classList.add('hidden');

  v.render();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', router);
document.addEventListener('DOMContentLoaded', router);

// ==================================================
//  DASHBOARD
// ==================================================
function renderDashboard() {
  const hoy = Fecha.hoy();
  const citasHoy = Citas.porFecha(hoy).sort((a,b) => a.hora.localeCompare(b.hora));
  const pacientes = Pacientes.all().filter(p => p.activo);
  const mesActual = hoy.slice(0,7);

  const citasMes = Citas.all().filter(c => c.fecha.startsWith(mesActual) && c.estado !== 'cancelada');
  const ingresosMes = citasMes.filter(c => c.pagado).reduce((s,c) => s + (c.tarifa || 0), 0);
  const pendientesPago = Citas.all().filter(c => !c.pagado && c.estado !== 'cancelada' && c.fecha <= hoy);
  const montoPendiente = pendientesPago.reduce((s,c) => s + (c.tarifa || 0), 0);

  const cfg = Config.get();

  // Próximas 5 citas
  const proximas = Citas.all()
    .filter(c => c.fecha >= hoy && c.estado !== 'cancelada')
    .sort((a,b) => (a.fecha+a.hora).localeCompare(b.fecha+b.hora))
    .slice(0, 5);

  const html = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">Sesiones hoy</div>
        <div class="value">${citasHoy.length}</div>
        <div class="muted">${citasHoy.length ? 'Próxima: ' + citasHoy[0].hora : 'Sin sesiones'}</div>
      </div>
      <div class="stat-card success">
        <div class="label">Ingresos ${mesActual}</div>
        <div class="value">${cfg.moneda}${ingresosMes}</div>
        <div class="muted">${citasMes.filter(c=>c.pagado).length} sesiones cobradas</div>
      </div>
      <div class="stat-card ${montoPendiente > 0 ? 'warning' : ''}">
        <div class="label">Por cobrar</div>
        <div class="value">${cfg.moneda}${montoPendiente}</div>
        <div class="muted">${pendientesPago.length} sesión(es)</div>
      </div>
      <div class="stat-card">
        <div class="label">Pacientes activos</div>
        <div class="value">${pacientes.length}</div>
        <div class="muted">${Pacientes.all().length} en total</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3>📅 Sesiones de hoy · ${Fecha.formatLargo(hoy)}</h3>
        ${citasHoy.length === 0 ? `
          <div class="empty"><div class="icon">☕</div><p>Día libre. Disfrútalo.</p></div>
        ` : `<div class="list">${citasHoy.map(c => {
          const p = Pacientes.get(c.pacienteId);
          return `
            <div class="list-item">
              <div class="info">
                <div class="title">${c.hora} · ${esc(p?.nombre || 'Paciente eliminado')}</div>
                <div class="sub">${c.duracion || cfg.duracionSesion} min · ${c.modalidad || 'Presencial'}</div>
              </div>
              <span class="badge ${c.pagado ? 'badge-success' : 'badge-warning'}">${c.pagado ? 'Pagado' : 'Pendiente'}</span>
            </div>`;
        }).join('')}</div>`}
      </div>

      <div class="card">
        <h3>🔜 Próximas sesiones</h3>
        ${proximas.length === 0 ? `
          <div class="empty"><div class="icon">📭</div><p>No hay citas próximas</p></div>
        ` : `<div class="list">${proximas.map(c => {
          const p = Pacientes.get(c.pacienteId);
          return `
            <div class="list-item">
              <div class="info">
                <div class="title">${esc(p?.nombre || '—')}</div>
                <div class="sub">${Fecha.format(c.fecha)} · ${c.hora}</div>
              </div>
            </div>`;
        }).join('')}</div>`}
      </div>
    </div>
  `;
  document.getElementById('view').innerHTML = html;
}

// ==================================================
//  AGENDA
// ==================================================
let semanaOffset = 0;

function renderAgenda() {
  const hoy = Fecha.hoy();
  const lunesBase = Fecha.lunesDe(hoy);
  const lunes = Fecha.addDias(lunesBase.toISOString().split('T')[0], semanaOffset * 7);
  const dias = Array.from({length:7}, (_,i) => Fecha.addDias(lunes, i));

  const finSemana = dias[6];
  const rangoTxt = `${Fecha.format(dias[0])} — ${Fecha.format(finSemana)}`;

  const html = `
    <div class="week-nav">
      <button class="btn-outline" id="prevWeek">← Anterior</button>
      <div style="text-align:center">
        <strong>${rangoTxt}</strong>
        ${semanaOffset !== 0 ? `<br><button class="btn-ghost btn-sm" id="hoyWeek">Volver a hoy</button>` : ''}
      </div>
      <button class="btn-outline" id="nextWeek">Siguiente →</button>
    </div>

    <div class="week-grid">
      ${dias.map(d => {
        const citas = Citas.porFecha(d).sort((a,b) => a.hora.localeCompare(b.hora));
        const esHoy = d === hoy;
        const [y,m,dd] = d.split('-');
        const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
        const dayName = dias[new Date(y,m-1,dd).getDay()];
        return `
          <div class="day-col ${esHoy ? 'today' : ''}">
            <div class="day-header">
              <span>${dayName}</span>
              <span class="num">${parseInt(dd)}</span>
            </div>
            ${citas.length === 0 ? '<div class="muted" style="font-size:.8rem;text-align:center;padding:20px 0;">—</div>' :
              citas.map(c => {
                const p = Pacientes.get(c.pacienteId);
                return `<div class="cita-chip" data-cita="${c.id}">
                  <span class="hora">${c.hora}</span>
                  <span class="pac">${esc(p?.nombre.split(' ')[0] || '—')}</span>
                </div>`;
              }).join('')}
          </div>`;
      }).join('')}
    </div>
  `;
  document.getElementById('view').innerHTML = html;

  document.getElementById('prevWeek').onclick = () => { semanaOffset--; renderAgenda(); };
  document.getElementById('nextWeek').onclick = () => { semanaOffset++; renderAgenda(); };
  const btnHoy = document.getElementById('hoyWeek');
  if (btnHoy) btnHoy.onclick = () => { semanaOffset = 0; renderAgenda(); };

  document.querySelectorAll('[data-cita]').forEach(el =>
    el.onclick = () => modalCita(parseInt(el.dataset.cita)));
}

function modalCita(id = null) {
  const c = id ? Citas.get(id) : null;
  const pacientes = Pacientes.all().filter(p => p.activo);
  if (pacientes.length === 0) {
    toast('Primero crea un paciente', 'error');
    return;
  }
  const cfg = Config.get();

  const body = `
    <form id="formCita">
      <label>Paciente</label>
      <select class="select" name="pacienteId" required>
        ${pacientes.map(p => `<option value="${p.id}" ${c?.pacienteId === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}
      </select>
      <div class="form-row">
        <div><label>Fecha</label><input type="date" class="input" name="fecha" value="${c?.fecha || Fecha.hoy()}" required></div>
        <div><label>Hora</label><input type="time" class="input" name="hora" value="${c?.hora || '10:00'}" required></div>
      </div>
      <div class="form-row">
        <div><label>Duración (min)</label><input type="number" class="input" name="duracion" value="${c?.duracion || cfg.duracionSesion}"></div>
        <div><label>Tarifa</label><input type="number" class="input" name="tarifa" value="${c?.tarifa ?? cfg.tarifaBase}" step="0.01"></div>
      </div>
      <label>Modalidad</label>
      <select class="select" name="modalidad">
        ${['Presencial','Online','Telefónica'].map(m => `<option ${c?.modalidad === m ? 'selected' : ''}>${m}</option>`).join('')}
      </select>
      <label>Estado</label>
      <select class="select" name="estado">
        ${['programada','realizada','cancelada'].map(e => `<option value="${e}" ${c?.estado === e ? 'selected' : ''}>${e}</option>`).join('')}
      </select>
      <label style="display:flex;align-items:center;gap:8px;margin-top:12px">
        <input type="checkbox" name="pagado" ${c?.pagado ? 'checked' : ''}> Marcar como pagada
      </label>
      <button type="submit" class="btn-primary btn-block" style="margin-top:16px">${c ? 'Guardar cambios' : 'Crear cita'}</button>
      ${c ? `<button type="button" class="btn-danger btn-block" style="margin-top:8px" id="btnEliminarCita">Eliminar cita</button>` : ''}
    </form>
  `;

  openModal({
    title: c ? 'Editar cita' : 'Nueva cita',
    body,
    onSubmit: () => {}
  });

  document.getElementById('formCita').onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      pacienteId: parseInt(fd.get('pacienteId')),
      fecha: fd.get('fecha'),
      hora: fd.get('hora'),
      duracion: parseInt(fd.get('duracion')),
      tarifa: parseFloat(fd.get('tarifa')),
      modalidad: fd.get('modalidad'),
      estado: fd.get('estado'),
      pagado: fd.get('pagado') === 'on'
    };
    if (c) { Citas.update(c.id, data); toast('Cita actualizada'); }
    else { Citas.add(data); toast('Cita creada'); }
    closeModal();
    router();
  };

  const btnDel = document.getElementById('btnEliminarCita');
  if (btnDel) btnDel.onclick = () => {
    confirmar('¿Eliminar esta cita?', () => {
      Citas.remove(c.id);
      closeModal();
      toast('Cita eliminada');
      router();
    });
  };
}

// ==================================================
//  PACIENTES
// ==================================================
let busquedaPaciente = '';

function renderPacientes() {
  const todos = Pacientes.all().sort((a,b) => a.nombre.localeCompare(b.nombre));
  const lista = todos.filter(p =>
    p.nombre.toLowerCase().includes(busquedaPaciente.toLowerCase()) ||
    (p.email || '').toLowerCase().includes(busquedaPaciente.toLowerCase()));

  const html = `
    <div class="search-bar">
      <input type="text" class="input" id="buscarPac" placeholder="🔍 Buscar por nombre o email..." value="${esc(busquedaPaciente)}">
    </div>

    ${lista.length === 0 ? `
      <div class="card"><div class="empty">
        <div class="icon">👥</div>
        <p>${busquedaPaciente ? 'Sin resultados' : 'Aún no tienes pacientes'}</p>
        ${!busquedaPaciente ? '<button class="btn-primary" style="margin-top:12px" onclick="modalPaciente()">+ Crear primer paciente</button>' : ''}
      </div></div>
    ` : `
      <div class="list">
        ${lista.map(p => {
          const citas = Citas.porPaciente(p.id).filter(c => c.estado !== 'cancelada');
          const ultima = citas.sort((a,b)=>b.fecha.localeCompare(a.fecha))[0];
          return `
            <div class="list-item">
              <div class="patient-avatar" style="width:44px;height:44px;font-size:1rem;">${iniciales(p.nombre)}</div>
              <div class="info">
                <div class="title">${esc(p.nombre)} ${!p.activo ? '<span class="badge badge-info">Inactivo</span>' : ''}</div>
                <div class="sub">${esc(p.email || '—')} · ${citas.length} sesión(es) · última: ${ultima ? Fecha.format(ultima.fecha) : '—'}</div>
              </div>
              <div class="actions">
                <button class="btn-outline btn-sm" onclick="verPaciente(${p.id})">Ver</button>
                <button class="btn-ghost btn-sm" onclick="modalPaciente(${p.id})">✏️</button>
              </div>
            </div>`;
        }).join('')}
      </div>
    `}
  `;
  document.getElementById('view').innerHTML = html;

  const buscar = document.getElementById('buscarPac');
  if (buscar) buscar.oninput = (e) => {
    busquedaPaciente = e.target.value;
    renderPacientes();
    document.getElementById('buscarPac').focus();
  };
}

function modalPaciente(id = null) {
  const p = id ? Pacientes.get(id) : null;
  const body = `
    <form id="formPac">
      <label>Nombre completo *</label>
      <input class="input" name="nombre" required value="${esc(p?.nombre || '')}">
      <div class="form-row">
        <div><label>Email</label><input type="email" class="input" name="email" value="${esc(p?.email || '')}"></div>
        <div><label>Teléfono</label><input class="input" name="telefono" value="${esc(p?.telefono || '')}"></div>
      </div>
      <div class="form-row">
        <div><label>Fecha nac.</label><input type="date" class="input" name="fechaNac" value="${p?.fechaNac || ''}"></div>
        <div><label>Inicio terapia</label><input type="date" class="input" name="inicio" value="${p?.inicio || Fecha.hoy()}"></div>
      </div>
      <label>Motivo de consulta</label>
      <textarea class="textarea" name="motivo">${esc(p?.motivo || '')}</textarea>
      <label>Notas generales</label>
      <textarea class="textarea" name="notasGenerales">${esc(p?.notasGenerales || '')}</textarea>
      <label style="display:flex;align-items:center;gap:8px;margin-top:12px">
        <input type="checkbox" name="activo" ${(p?.activo ?? true) ? 'checked' : ''}> Paciente activo
      </label>
      <button type="submit" class="btn-primary btn-block" style="margin-top:16px">${p ? 'Guardar cambios' : 'Crear paciente'}</button>
      ${p ? `<button type="button" class="btn-danger btn-block" style="margin-top:8px" id="btnEliminarPac">Eliminar paciente</button>` : ''}
    </form>
  `;

  openModal({ title: p ? 'Editar paciente' : 'Nuevo paciente', body });

  document.getElementById('formPac').onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      nombre: fd.get('nombre').trim(),
      email: fd.get('email').trim(),
      telefono: fd.get('telefono').trim(),
      fechaNac: fd.get('fechaNac'),
      inicio: fd.get('inicio'),
      motivo: fd.get('motivo').trim(),
      notasGenerales: fd.get('notasGenerales').trim(),
      activo: fd.get('activo') === 'on'
    };
    if (p) { Pacientes.update(p.id, data); toast('Paciente actualizado'); }
    else { Pacientes.add(data); toast('Paciente creado'); }
    closeModal();
    router();
  };

  const btnDel = document.getElementById('btnEliminarPac');
  if (btnDel) btnDel.onclick = () => {
    confirmar('Se eliminará el paciente, sus citas y sus notas. Esta acción no se puede deshacer.', () => {
      Pacientes.remove(p.id);
      closeModal();
      toast('Paciente eliminado');
      location.hash = '#/pacientes';
      router();
    });
  };
}

function verPaciente(id) {
  const p = Pacientes.get(id);
  if (!p) return;
  const citas = Citas.porPaciente(id).sort((a,b) => b.fecha.localeCompare(a.fecha));
  const notas = Notas.porPaciente(id);

  const body = `
    <div class="patient-header">
      <div class="patient-avatar">${iniciales(p.nombre)}</div>
      <div>
        <h3 style="margin:0">${esc(p.nombre)}</h3>
        <div class="muted">${esc(p.email || '')} ${p.telefono ? '· ' + esc(p.telefono) : ''}</div>
        ${p.inicio ? `<div class="muted" style="margin-top:4px;">En terapia desde ${Fecha.format(p.inicio)}</div>` : ''}
      </div>
    </div>

    ${p.motivo ? `<div style="margin-bottom:16px"><strong>Motivo:</strong><p class="muted" style="margin-top:4px">${esc(p.motivo)}</p></div>` : ''}

    <div class="tabs">
      <button class="tab active" data-tab="citas">Sesiones (${citas.length})</button>
      <button class="tab" data-tab="notas">Notas (${notas.length})</button>
    </div>

    <div id="tabContent"></div>

    <div style="display:flex;gap:8px;margin-top:20px;">
      <button class="btn-outline btn-block" onclick="closeModal();modalPaciente(${p.id})">Editar paciente</button>
      <button class="btn-primary btn-block" onclick="closeModal();modalNota(null,${p.id})">+ Nueva nota</button>
    </div>
  `;

  openModal({ title: 'Ficha del paciente', body });

  const renderTab = (tab) => {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    const cont = document.getElementById('tabContent');
    if (tab === 'citas') {
      cont.innerHTML = citas.length === 0
        ? '<div class="empty"><div class="icon">📅</div><p>Sin sesiones registradas</p></div>'
        : `<div class="list">${citas.map(c => `
            <div class="list-item">
              <div class="info">
                <div class="title">${Fecha.format(c.fecha)} · ${c.hora}</div>
                <div class="sub">${c.modalidad || ''} · ${c.duracion || 50} min</div>
              </div>
              <span class="badge ${c.pagado ? 'badge-success' : 'badge-warning'}">${c.pagado ? 'Pagada' : 'Pendiente'}</span>
            </div>`).join('')}</div>`;
    } else {
      cont.innerHTML = notas.length === 0
        ? '<div class="empty"><div class="icon">📝</div><p>Sin notas registradas</p></div>'
        : `<div class="list">${notas.map(n => `
            <div class="list-item">
              <div class="info">
                <div class="title">${esc(n.titulo || 'Nota')}</div>
                <div class="sub">${Fecha.format(n.fecha)}</div>
                <div style="margin-top:6px;font-size:.9rem;color:#444;white-space:pre-wrap;">${esc(n.contenido).slice(0,160)}${n.contenido.length > 160 ? '…' : ''}</div>
              </div>
              <button class="btn-ghost btn-sm" onclick="closeModal();modalNota(${n.id})">✏️</button>
            </div>`).join('')}</div>`;
    }
  };

  document.querySelectorAll('.tab').forEach(t => t.onclick = () => renderTab(t.dataset.tab));
  renderTab('citas');
}

// ==================================================
//  NOTAS
// ==================================================
function renderNotas() {
  const notas = Notas.all().sort((a,b) => b.fecha.localeCompare(a.fecha));
  const html = `
    ${notas.length === 0 ? `
      <div class="card"><div class="empty">
        <div class="icon">📝</div>
        <p>Sin notas registradas</p>
        <button class="btn-primary" style="margin-top:12px" onclick="modalNota()">+ Crear nota</button>
      </div></div>
    ` : `
      <div class="list">
        ${notas.map(n => {
          const p = Pacientes.get(n.pacienteId);
          return `
            <div class="list-item">
              <div class="info">
                <div class="title">${esc(n.titulo || 'Nota')}</div>
                <div class="sub">${esc(p?.nombre || 'Paciente eliminado')} · ${Fecha.format(n.fecha)}</div>
                <div style="margin-top:8px;font-size:.9rem;color:#444;white-space:pre-wrap;">${esc(n.contenido).slice(0,200)}${n.contenido.length > 200 ? '…' : ''}</div>
              </div>
              <button class="btn-outline btn-sm" onclick="modalNota(${n.id})">Abrir</button>
            </div>`;
        }).join('')}
      </div>
    `}
  `;
  document.getElementById('view').innerHTML = html;
}

function modalNota(id = null, pacientePreseleccionado = null) {
  const n = id ? Notas.get(id) : null;
  const pacientes = Pacientes.all().sort((a,b)=>a.nombre.localeCompare(b.nombre));
  if (pacientes.length === 0) {
    toast('Primero crea un paciente', 'error');
    return;
  }
  const pid = n?.pacienteId || pacientePreseleccionado;

  const body = `
    <form id="formNota">
      <label>Paciente *</label>
      <select class="select" name="pacienteId" required>
        ${pacientes.map(p => `<option value="${p.id}" ${pid === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}
      </select>
      <label>Fecha</label>
      <input type="date" class="input" name="fecha" value="${n?.fecha || Fecha.hoy()}" required>
      <label>Título</label>
      <input class="input" name="titulo" value="${esc(n?.titulo || '')}" placeholder="Ej: Sesión 5 · Reestructuración cognitiva">
      <label>Contenido</label>
      <textarea class="textarea" name="contenido" rows="8" required placeholder="Observaciones, evolución, técnicas aplicadas, tareas asignadas...">${esc(n?.contenido || '')}</textarea>
      <button type="submit" class="btn-primary btn-block">${n ? 'Guardar cambios' : 'Crear nota'}</button>
      ${n ? `<button type="button" class="btn-danger btn-block" style="margin-top:8px" id="btnEliminarNota">Eliminar nota</button>` : ''}
    </form>
  `;

  openModal({ title: n ? 'Editar nota' : 'Nueva nota de sesión', body });

  document.getElementById('formNota').onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      pacienteId: parseInt(fd.get('pacienteId')),
      fecha: fd.get('fecha'),
      titulo: fd.get('titulo').trim(),
      contenido: fd.get('contenido').trim()
    };
    if (n) { Notas.update(n.id, data); toast('Nota actualizada'); }
    else { Notas.add(data); toast('Nota creada'); }
    closeModal();
    router();
  };

  const btnDel = document.getElementById('btnEliminarNota');
  if (btnDel) btnDel.onclick = () => {
    confirmar('¿Eliminar esta nota?', () => {
      Notas.remove(n.id);
      closeModal();
      toast('Nota eliminada');
      router();
    });
  };
}

// ==================================================
//  FINANZAS
// ==================================================
function renderFinanzas() {
  const cfg = Config.get();
  const hoy = Fecha.hoy();
  const mesActual = hoy.slice(0,7);

  const citasMes = Citas.all().filter(c => c.fecha.startsWith(mesActual) && c.estado !== 'cancelada');
  const cobradas = citasMes.filter(c => c.pagado);
  const pendientes = citasMes.filter(c => !c.pagado);
  const ingresoMes = cobradas.reduce((s,c) => s + (c.tarifa||0), 0);
  const pendienteMes = pendientes.reduce((s,c) => s + (c.tarifa||0), 0);

  // Ingresos por mes (últimos 6)
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const ing = Citas.all()
      .filter(c => c.fecha.startsWith(ym) && c.pagado)
      .reduce((s,c) => s + (c.tarifa||0), 0);
    meses.push({ label: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][d.getMonth()], ingreso: ing });
  }
  const maxIngreso = Math.max(...meses.map(m => m.ingreso), 1);

  // Pendientes de pago (todas las fechas, hasta hoy)
  const pendientesTotales = Citas.all()
    .filter(c => !c.pagado && c.estado !== 'cancelada' && c.fecha <= hoy)
    .sort((a,b) => (a.fecha+a.hora).localeCompare(b.fecha+b.hora));

  const html = `
    <div class="stats-grid">
      <div class="stat-card success">
        <div class="label">Cobrado este mes</div>
        <div class="value">${cfg.moneda}${ingresoMes}</div>
        <div class="muted">${cobradas.length} sesiones</div>
      </div>
      <div class="stat-card warning">
        <div class="label">Pendiente este mes</div>
        <div class="value">${cfg.moneda}${pendienteMes}</div>
        <div class="muted">${pendientes.length} sesiones</div>
      </div>
      <div class="stat-card">
        <div class="label">Total por cobrar</div>
        <div class="value">${cfg.moneda}${pendientesTotales.reduce((s,c)=>s+(c.tarifa||0),0)}</div>
        <div class="muted">${pendientesTotales.length} sesiones vencidas</div>
      </div>
    </div>

    <div class="card">
      <h3>Últimos 6 meses</h3>
      <div style="display:flex;align-items:flex-end;gap:12px;height:180px;padding:12px 0;">
        ${meses.map(m => `
          <div style="flex:1;text-align:center;">
            <div style="background:var(--primary);border-radius:6px 6px 0 0;height:${(m.ingreso/maxIngreso)*140}px;min-height:4px;transition:.3s;"></div>
            <div style="font-size:.75rem;color:var(--muted);margin-top:6px;">${m.label}</div>
            <div style="font-size:.75rem;font-weight:600;">${cfg.moneda}${m.ingreso}</div>
          </div>`).join('')}
      </div>
    </div>

    <div class="card">
      <h3>💸 Sesiones pendientes de cobro</h3>
      ${pendientesTotales.length === 0 ? `
        <div class="empty"><div class="icon">✅</div><p>¡Todo cobrado!</p></div>
      ` : `
        <div class="list">
          ${pendientesTotales.map(c => {
            const p = Pacientes.get(c.pacienteId);
            return `
              <div class="list-item">
                <div class="info">
                  <div class="title">${esc(p?.nombre || '—')}</div>
                  <div class="sub">${Fecha.format(c.fecha)} · ${c.hora}</div>
                </div>
                <div style="font-weight:700">${cfg.moneda}${c.tarifa||0}</div>
                <button class="btn-primary btn-sm" onclick="marcarPagada(${c.id})">Marcar pagada</button>
              </div>`;
          }).join('')}
        </div>
      `}
    </div>
  `;
  document.getElementById('view').innerHTML = html;
}

function marcarPagada(id) {
  Citas.update(id, { pagado: true });
  toast('Pago registrado');
  renderFinanzas();
}

// ==================================================
//  CONFIGURACIÓN
// ==================================================
function renderConfig() {
  const c = Config.get();
  const html = `
    <div class="card" style="max-width:600px;">
      <h3>Datos del profesional</h3>
      <form id="formConfig">
        <label>Nombre</label>
        <input class="input" name="nombre" value="${esc(c.nombre)}">
        <div class="form-row">
          <div><label>Especialidad</label><input class="input" name="especialidad" value="${esc(c.especialidad)}"></div>
          <div><label>Email</label><input type="email" class="input" name="email" value="${esc(c.email)}"></div>
        </div>
        <div class="form-row">
          <div><label>Teléfono</label><input class="input" name="telefono" value="${esc(c.telefono)}"></div>
          <div><label>Moneda</label>
            <select class="select" name="moneda">
              ${['$','€','MXN','ARS','COP','CLP'].map(m => `<option ${c.moneda === m ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div><label>Tarifa base</label><input type="number" class="input" name="tarifaBase" value="${c.tarifaBase}" step="0.01"></div>
          <div><label>Duración sesión (min)</label><input type="number" class="input" name="duracionSesion" value="${c.duracionSesion}"></div>
        </div>
        <button type="submit" class="btn-primary btn-block">Guardar configuración</button>
      </form>
    </div>

    <div class="card" style="max-width:600px;">
      <h3>⚠️ Zona de riesgo</h3>
      <p class="muted" style="margin-bottom:12px">
        Exporta tus datos como copia de seguridad o restaura desde un archivo.
        Los datos viven <strong>solo en este navegador</strong>.
      </p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn-outline" id="btnExport">⬇ Exportar datos</button>
        <button class="btn-outline" id="btnImport">⬆ Importar datos</button>
        <button class="btn-danger" id="btnReset">🗑 Borrar todo</button>
      </div>
      <input type="file" id="fileImport" accept=".json" class="hidden">
    </div>
  `;
  document.getElementById('view').innerHTML = html;

  document.getElementById('formConfig').onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    Config.save({
      nombre: fd.get('nombre'), especialidad: fd.get('especialidad'),
      email: fd.get('email'), telefono: fd.get('telefono'),
      moneda: fd.get('moneda'), tarifaBase: parseFloat(fd.get('tarifaBase')),
      duracionSesion: parseInt(fd.get('duracionSesion'))
    });
    toast('Configuración guardada');
  };

  document.getElementById('btnExport').onclick = () => {
    const data = {
      config: Config.get(),
      pacientes: Pacientes.all(),
      citas: Citas.all(),
      notas: Notas.all(),
      exportado: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `mentegest-backup-${Fecha.hoy()}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast('Datos exportados');
  };

  document.getElementById('btnImport').onclick = () => document.getElementById('fileImport').click();
  document.getElementById('fileImport').onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        confirmar('Esto reemplazará todos los datos actuales. ¿Continuar?', () => {
          if (d.config) Config.save(d.config);
          if (d.pacientes) Pacientes.save(d.pacientes);
          if (d.citas) Citas.save(d.citas);
          if (d.notas) Notas.save(d.notas);
          toast('Datos restaurados');
          router();
        });
      } catch { toast('Archivo inválido', 'error'); }
    };
    reader.readAsText(f);
  };

  document.getElementById('btnReset').onclick = () => {
    confirmar('Se borrarán TODOS tus datos. Sin vuelta atrás.', () => {
      ['config','pacientes','citas','notas'].forEach(k => DB.remove(k));
      toast('Datos eliminados');
      location.hash = '#/dashboard';
      router();
    }, '⚠️ Última advertencia');
  };
}
