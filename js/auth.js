const Auth = {
  // Hash SHA-256 (NO seguro para producción, solo demo)
  async hash(text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  getUsuarios() { return DB.get('usuarios', []); },
  saveUsuarios(list) { DB.set('usuarios', list); },

  async registrar(nombre, email, password) {
    const usuarios = this.getUsuarios();
    if (usuarios.find(u => u.email === email)) {
      throw new Error('Este correo ya está registrado');
    }
    const hash = await this.hash(password);
    const user = { id: Date.now(), nombre, email, password: hash };
    usuarios.push(user);
    this.saveUsuarios(usuarios);
    this.setSession(user);
    return user;
  },

  async login(email, password) {
    const usuarios = this.getUsuarios();
    const user = usuarios.find(u => u.email === email);
    if (!user) throw new Error('Credenciales inválidas');
    const hash = await this.hash(password);
    if (hash !== user.password) throw new Error('Credenciales inválidas');
    this.setSession(user);
    return user;
  },

  setSession(user) {
    DB.set('session', { id: user.id, nombre: user.nombre, email: user.email });
  },

  getUser() { return DB.get('session', null); },
  isLogged() { return !!this.getUser(); },
  logout() { DB.remove('session'); }
};
