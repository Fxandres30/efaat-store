/**
 * authService.js — reglas de negocio de sesión: qué cuenta como
 * "logueado de verdad" (no una sesión anónima) y cómo se traduce una
 * fila de `public.users` a la forma que ya usan las vistas. Sin
 * llamadas a Supabase (eso es de authRepository.js).
 */
const AuthService = (() => {
  // Una sesión anónima SÍ es una sesión real de Supabase (auth.uid()
  // válido, necesaria para carrito/favoritos) pero NO cuenta como
  // "logueado" para la UI (mostrar nombre, /account, /admin, etc.).
  function isRealSession(session) {
    return !!session && session.user && session.user.is_anonymous !== true;
  }

  function mapProfile(row) {
    if (!row) return null;
    return {
      userId: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      avatar: row.avatar,
      isAnonymous: !!row.is_anonymous,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : null,
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at).getTime() : null,
    };
  }

  return { isRealSession, mapProfile };
})();
