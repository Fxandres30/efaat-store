/**
 * authOrchestrator.js — coordina AuthRepository/AddressRepository →
 * AuthService → Store para toda la sesión (Fase 1, informe de
 * arquitectura). Reemplaza el login local de la fase anterior.
 *
 * Decisión de diseño clave: `Store.state.currentUser` se mantiene con
 * la MISMA semántica que ya tenía todo el proyecto — null para
 * invitado, poblado SOLO para una sesión real (no anónima). La sesión
 * anónima de Supabase existe para que carrito/favoritos (RLS por
 * dueño) tengan un auth.uid() válido, pero nunca se refleja en
 * Store.state.currentUser — así ningún call site existente que hace
 * `if (Store.state.currentUser)` (ui/shell.js, checkout.js, etc.)
 * necesita reescribirse para esta fase.
 */
const AuthOrchestrator = (() => {
  async function syncFromSession(session) {
    if (AuthService.isRealSession(session)) {
      const profile = await AuthRepository.getProfile(session.user.id);
      Store.setUser(AuthService.mapProfile(profile));
    } else {
      Store.setUser(null);
    }
  }

  // Se llama UNA vez al arrancar la app, antes de la primera
  // resolución de rutas (el guard adminOnly del Router depende de que
  // esto ya haya terminado — ver js/app/app.js).
  async function bootstrapSession() {
    try {
      let session = await AuthRepository.getSession();
      if (!session) session = await AuthRepository.signInAnonymously();
      await syncFromSession(session);
      AuthRepository.onAuthStateChange((_event, newSession) => {
        syncFromSession(newSession).catch((err) => console.error('[AuthOrchestrator] onAuthStateChange:', err.message));
      });
      return { ok: true };
    } catch (err) {
      console.error('[AuthOrchestrator] no se pudo inicializar la sesión de Supabase:', err.message);
      Store.setUser(null);
      return { ok: false, error: err.message };
    }
  }

  async function login(email, password) {
    try {
      const session = await AuthRepository.signInWithPassword(email, password);
      await syncFromSession(session);
      return { ok: true, user: Store.state.currentUser };
    } catch (err) {
      return { ok: false, error: 'Correo o contraseña incorrectos.' };
    }
  }

  // Convierte la sesión anónima actual en una cuenta real (conserva el
  // mismo auth.uid(), y con él, el carrito/favoritos que ya tenía como
  // invitado). Si el proyecto de Supabase exige confirmación de
  // correo, la cuenta queda pendiente hasta que el visitante confirme
  // — se lo indicamos explícitamente en vez de fingir éxito.
  async function register({ name, email, phone, password }) {
    try {
      await AuthRepository.upgradeAnonymousToReal({ email, password, name, phone });
      const session = await AuthRepository.getSession();
      if (!AuthService.isRealSession(session)) {
        return { ok: true, pendingConfirmation: true };
      }
      await syncFromSession(session);
      return { ok: true, user: Store.state.currentUser };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async function logout() {
    try {
      await AuthRepository.signOut();
    } catch (err) { /* continuamos igual — el objetivo es dejar al visitante en estado invitado */ }
    Store.setUser(null);
    try {
      const session = await AuthRepository.signInAnonymously();
      await syncFromSession(session);
    } catch (err) {
      console.error('[AuthOrchestrator] no se pudo reabrir sesión anónima tras logout:', err.message);
    }
  }

  async function updateProfile(patch) {
    const user = Store.state.currentUser;
    if (!user) return { ok: false, error: 'No hay sesión activa.' };
    try {
      const row = await AuthRepository.updateProfile(user.userId, patch);
      Store.setUser(AuthService.mapProfile(row));
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  }

  // ---------- Direcciones ----------
  async function listAddresses() {
    const user = Store.state.currentUser;
    if (!user) return [];
    return AddressRepository.list(user.userId);
  }

  async function getDefaultAddress() {
    const list = await listAddresses();
    return list.find((a) => a.isDefault) || list[0] || null;
  }

  async function saveAddress(address) {
    const user = Store.state.currentUser;
    if (!user) return { ok: false, error: 'No hay sesión activa.' };
    try {
      let saved;
      if (address.id) {
        saved = await AddressRepository.update(address.id, address);
      } else {
        const existing = await listAddresses();
        const isFirst = existing.length === 0;
        saved = await AddressRepository.insert(user.userId, { ...address, isDefault: isFirst || address.isDefault });
      }
      if (saved.isDefault) await AddressRepository.clearDefault(user.userId, saved.id);
      return { ok: true, address: saved };
    } catch (err) { return { ok: false, error: err.message }; }
  }

  async function deleteAddress(addressId) {
    try {
      await AddressRepository.remove(addressId);
      const user = Store.state.currentUser;
      const remaining = user ? await AddressRepository.list(user.userId) : [];
      if (remaining.length && !remaining.some((a) => a.isDefault)) {
        await AddressRepository.update(remaining[0].id, { isDefault: true });
      }
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  }

  async function setDefaultAddress(addressId) {
    const user = Store.state.currentUser;
    if (!user) return { ok: false, error: 'No hay sesión activa.' };
    try {
      await AddressRepository.clearDefault(user.userId, addressId);
      await AddressRepository.update(addressId, { isDefault: true });
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  }

  return {
    bootstrapSession, login, register, logout, updateProfile,
    listAddresses, getDefaultAddress, saveAddress, deleteAddress, setDefaultAddress,
  };
})();
