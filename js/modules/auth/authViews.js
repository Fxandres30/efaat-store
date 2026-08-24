/**
 * authViews.js — pantallas de login/registro (extraído de
 * js/views.js en la reorganización arquitectónica). Usa AuthModule
 * (login local — ver js/modules/auth/auth.js).
 */
const AuthViews = (() => {
  function renderLogin() {
    const root = Utils.qs('#viewRoot');
    root.innerHTML = `
      <div class="wrap auth-box">
        <h2 class="h-display">Iniciar sesión</h2>
        <p class="sub">Accede a tus pedidos, favoritos y direcciones guardadas.</p>
        <div class="form-row"><label>Correo</label><input id="lEmail" type="email"></div>
        <div class="form-row"><label>Contraseña</label><input id="lPass" type="password"></div>
        <button class="btn btn-primary btn-block" id="btnLogin">Entrar</button>
        <div class="auth-switch">¿No tienes cuenta? <a href="#/register">Crear cuenta</a></div>
        <div class="auth-switch"><a href="#/checkout" style="color:var(--c-text-dim);">Continuar como invitado →</a></div>
        <div class="auth-demo-hint">DEMO — Cliente: cliente@demo.com / 123456<br>DEMO — Admin: admin@demo.com / admin123</div>
      </div>`;
    Utils.qs('#btnLogin').addEventListener('click', async () => {
      const btn = Utils.qs('#btnLogin'); btn.disabled = true;
      const res = await AuthModule.login(Utils.qs('#lEmail').value.trim(), Utils.qs('#lPass').value);
      btn.disabled = false;
      if (res.ok) { Notify.success(`Hola, ${res.user.name.split(' ')[0]}.`); location.hash = res.user.role === 'admin' ? '#/admin' : '#/account'; }
      else Notify.error(res.error);
    });
  }

  function renderRegister() {
    const root = Utils.qs('#viewRoot');
    root.innerHTML = `
      <div class="wrap auth-box">
        <h2 class="h-display">Crear cuenta</h2>
        <p class="sub">Guarda tus direcciones y revisa tus pedidos cuando quieras.</p>
        <div class="form-row"><label>Nombre completo</label><input id="rName"></div>
        <div class="form-row"><label>Correo</label><input id="rEmail" type="email"></div>
        <div class="form-row"><label>Teléfono</label><input id="rPhone"></div>
        <div class="form-row"><label>Contraseña</label><input id="rPass" type="password"></div>
        <button class="btn btn-primary btn-block" id="btnRegister">Crear cuenta</button>
        <div class="auth-switch">¿Ya tienes cuenta? <a href="#/login">Iniciar sesión</a></div>
      </div>`;
    Utils.qs('#btnRegister').addEventListener('click', async () => {
      const name = Utils.qs('#rName').value.trim();
      const email = Utils.qs('#rEmail').value.trim();
      const phone = Utils.qs('#rPhone').value.trim();
      const pass = Utils.qs('#rPass').value;
      if (!name || !/^\S+@\S+\.\S+$/.test(email) || pass.length < 6) { Notify.error('Revisa los datos: correo válido y contraseña de mínimo 6 caracteres.'); return; }
      const btn = Utils.qs('#btnRegister'); btn.disabled = true;
      const res = await AuthModule.register({ name, email, phone, password: pass });
      btn.disabled = false;
      if (res.ok && res.pendingConfirmation) { Notify.info('Cuenta creada. Revisa tu correo para confirmarla antes de iniciar sesión.'); location.hash = '#/login'; }
      else if (res.ok) { Notify.success('Cuenta creada.'); location.hash = '#/account'; }
      else Notify.error(res.error);
    });
  }

  return { renderLogin, renderRegister };
})();
