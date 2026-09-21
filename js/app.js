const Citas = {
  getAll() { return DB.get('citas', []); },
  save(list) { DB.set('citas', list); },

  crear(userId, psicologo, fecha, hora, motivo) {
    const citas = this.getAll();
    const cita = {
      id: Date.now(),
      userId,
      psicologo,
      fecha, hora, motivo,
      estado: 'pendiente',
      createdAt: new Date().toISOString()
    };
    citas.push(cita);
    this.save(citas);
    return cita;
  },

  porUsuario(userId) {
    return this.getAll()
      .filter(c => c.userId === userId)
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  },

  cancelar(id, userId) {
    const citas = this.getAll();
    const filtradas = citas.filter(c => !(c.id === id && c.userId === userId));
    this.save(filtradas);
    return citas.length !== filtradas.length;
  }
};
