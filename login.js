// Přihlášení, "Kdo jsi?" a čekání na schválení.
import { esc, icon, looseName } from './util.js';
import { avatar, toast } from './ui.js';
import { PARTY_NAMES, nameLabel } from './config.js';
import {
  session, signInGoogle, signInEmail, registerEmail, resetPassword, logout,
  createMember, authErrorText, isAdminEmail
} from './auth.js';

const G_LOGO = '<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

const logo = () => `<div class="logo"><img src="icon-192.png" alt=""></div>`;

export function render(root) {
  let mode = 'login'; // 'login' | 'register'
  const draw = () => {
    root.innerHTML = `<div class="screen">
      <div class="center">
        ${logo()}
        <div class="brand" style="font-size:30px">KoKrŠNeK</div>
        <div class="sub" style="font-size:15px">Akce, chat a check-iny party</div>
      </div>
      <form class="auth" novalidate>
        <button type="button" class="gbtn" data-g>${G_LOGO}Pokračovat přes Google</button>
        <div class="or">nebo e-mailem</div>
        <input class="input" type="email" name="email" autocomplete="email" placeholder="E-mail" aria-label="E-mail" inputmode="email">
        <input class="input" type="password" name="pass" autocomplete="${mode === 'register' ? 'new-password' : 'current-password'}" placeholder="${mode === 'register' ? 'Heslo (aspoň 6 znaků)' : 'Heslo'}" aria-label="Heslo">
        <button type="submit" class="btn primary big">${mode === 'register' ? 'Vytvořit účet' : 'Přihlásit se'}</button>
        <div class="err" role="alert"></div>
        <div class="links">
          <button type="button" data-mode>${mode === 'register' ? 'Už mám účet' : 'Nemám účet'}</button>
          <button type="button" data-reset>Zapomenuté heslo</button>
        </div>
        <div class="note">Nový účet musí schválit správce party.</div>
      </form>
    </div>`;
    const form = root.querySelector('form');
    const err = root.querySelector('.err');
    const busy = (on) => form.querySelectorAll('button,input').forEach((b) => { b.disabled = on; });
    root.querySelector('[data-g]').onclick = async () => {
      err.textContent = ''; busy(true);
      try { await signInGoogle(); } catch (e) { err.textContent = authErrorText(e); busy(false); }
    };
    root.querySelector('[data-mode]').onclick = () => {
      const email = form.email.value;
      mode = mode === 'login' ? 'register' : 'login';
      draw();
      root.querySelector('form').email.value = email;
    };
    root.querySelector('[data-reset]').onclick = async () => {
      const email = form.email.value.trim();
      if (!email) { err.textContent = 'Napiš nahoru e-mail a klikni znovu.'; form.email.focus(); return; }
      try { await resetPassword(email); toast('Odkaz na nové heslo je na cestě do e-mailu.'); err.textContent = ''; }
      catch (e) { err.textContent = authErrorText(e); }
    };
    form.onsubmit = async (e) => {
      e.preventDefault();
      err.textContent = '';
      const email = form.email.value, pass = form.pass.value;
      if (!email.trim() || !pass) { err.textContent = 'Vyplň e-mail i heslo.'; return; }
      busy(true);
      try { mode === 'register' ? await registerEmail(email, pass) : await signInEmail(email, pass); }
      catch (e2) { err.textContent = authErrorText(e2); busy(false); }
    };
  };
  draw();
}

export function renderWho(root) {
  const u = session.user;
  let chosen = '';
  const admin = isAdminEmail(u);
  root.innerHTML = `<div class="screen">
    <div class="top"><div><div class="h1">Kdo jsi?</div><div class="sub">${esc(u.email || '')}</div></div>
      <button class="ibtn" data-out aria-label="Odhlásit">${icon('logout')}</button></div>
    <div class="scroll" style="padding-bottom:30px">
      <p class="sub" style="margin:0 0 14px;font-size:14px;line-height:1.45">Vyber jméno, pod kterým tě parta zná. Podle něj se k tobě připojí docházka, komentáře a věci ze staré aplikace.</p>
      <div style="display:flex;flex-direction:column;gap:8px" role="radiogroup" aria-label="Jméno">
        ${PARTY_NAMES.map((n) => `<label class="pick"><input type="radio" name="who" value="${esc(n)}" style="order:3">${avatar(n)}<b>${esc(nameLabel(n))}</b></label>`).join('')}
        <label class="pick"><input type="radio" name="who" value="__jine" style="order:3"><span class="av" style="background:var(--surface);color:var(--ink2)">${icon('plus', 18)}</span><b>Jiné jméno</b></label>
      </div>
      <input class="input" data-other placeholder="Tvoje jméno" aria-label="Jiné jméno" style="margin-top:10px;display:none" maxlength="30">
      <div class="err" role="alert" style="margin-top:12px"></div>
      <button class="btn primary big block" data-go style="margin-top:4px">${admin ? 'Pokračovat' : 'Poslat žádost o přijetí'}</button>
    </div>
  </div>`;
  const other = root.querySelector('[data-other]');
  const err = root.querySelector('.err');
  root.querySelectorAll('input[name=who]').forEach((r) => r.addEventListener('change', () => {
    root.querySelectorAll('.pick').forEach((p) => p.classList.toggle('on', p.contains(r) && r.checked));
    chosen = r.value;
    other.style.display = chosen === '__jine' ? 'block' : 'none';
    if (chosen === '__jine') other.focus();
  }));
  root.querySelector('[data-out]').onclick = () => logout();
  root.querySelector('[data-go]').onclick = async (e) => {
    let name = chosen === '__jine' ? other.value.trim() : chosen;
    // Kdo napíše „Pecák“ ručně, dostane stejné jméno jako ve staré aplikaci.
    const same = PARTY_NAMES.find((n) => looseName(n) === looseName(name));
    if (same) name = same;
    if (!name) { err.textContent = 'Vyber jméno.'; return; }
    if (/[\/]/.test(name)) { err.textContent = 'Jméno nesmí obsahovat lomítko.'; return; }
    e.target.disabled = true;
    try { await createMember(name); }
    catch (ex) { console.error(ex); err.textContent = 'Nepovedlo se uložit (' + (ex.code || ex.message) + ').'; e.target.disabled = false; }
  };
}

export function renderPending(root) {
  const m = session.member;
  root.innerHTML = `<div class="screen">
    <div class="center">
      ${logo()}
      <div class="h1">Čekáš na schválení</div>
      <p class="sub" style="font-size:15px;line-height:1.5;max-width:320px">Ahoj ${esc(m.name)}! Žádost o přijetí odešla. Jakmile tě správce party schválí, tahle obrazovka se sama přepne.</p>
      <div class="chip">${esc(session.user.email || '')}</div>
    </div>
    <div class="auth"><button class="btn big" data-out>${icon('logout', 18)}Odhlásit se</button></div>
  </div>`;
  root.querySelector('[data-out]').onclick = () => logout();
}
