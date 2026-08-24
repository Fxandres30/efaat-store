/**
 * authRepository.js — única capa que llama a `supabase.auth.*` y a la
 * tabla `public.users` (perfil, 1:1 con auth.users). Reescrito para la
 * Fase 1 "Auth real" del informe de arquitectura: reemplaza el puente
 * admin-only de la fase anterior (`signInAdmin`/`waitForAdminSession`,
 * eliminados) por Auth real para TODO visitante — anónimo por
 * defecto, real al loguearse/registrarse.
 */
const AuthRepository = (() => {
  async function getSession() {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  // Todo visitante arranca con una sesión anónima real (auth.uid()
  // real) — necesaria para que carrito/favoritos (RLS por dueño)
  // funcionen sin exigir login. Requiere "Anonymous Sign-Ins"
  // habilitado en el dashboard de Supabase (Authentication → Sign In
  // / Providers).
  async function signInAnonymously() {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return data.session;
  }

  async function signInWithPassword(email, password) {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
  }

  // Si la sesión actual es anónima, `updateUser` la CONVIERTE en una
  // cuenta real en el mismo auth.uid() (conserva carrito/favoritos que
  // ya tenía como invitado) en vez de crear un usuario nuevo separado
  // — por eso el registro nunca usa `signUp` directo mientras haya una
  // sesión anónima activa (que, con el bootstrap de Fase 1, es
  // siempre, salvo fallo de red).
  async function upgradeAnonymousToReal({ email, password, name, phone }) {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase.auth.updateUser({
      email, password, data: { name, phone },
    });
    if (error) throw error;
    return data.user;
  }

  async function signUp({ email, password, name, phone }) {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { name, phone } },
    });
    if (error) throw error;
    return data.session;
  }

  async function signOut() {
    const supabase = await SupabaseClient.getClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  // callback(event, session) — devuelve una función para desuscribirse.
  async function onAuthStateChange(callback) {
    const supabase = await SupabaseClient.getClient();
    const { data } = supabase.auth.onAuthStateChange(callback);
    return () => data.subscription.unsubscribe();
  }

  // ---------- Perfil (public.users) ----------
  async function getProfile(userId) {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function updateProfile(userId, patch) {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase.from('users').update(patch).eq('id', userId).select().single();
    if (error) throw error;
    return data;
  }

  // Admin: clientes REALES (excluye sesiones anónimas — is_anonymous
  // requiere la migración 0003) para /admin/customers. RLS
  // (p_users_self_read) exige is_admin() para ver filas de otros
  // usuarios — solo funciona con sesión admin.
  async function listCustomers() {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'customer')
      .eq('is_anonymous', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  return {
    getSession, signInAnonymously, signInWithPassword, upgradeAnonymousToReal, signUp,
    signOut, onAuthStateChange, getProfile, updateProfile, listCustomers,
  };
})();
