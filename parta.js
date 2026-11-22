// Parta: můj účet, schvalování členů, import akcí, odhlášení.
import { esc, icon, fmtStamp } from './util.js';
import { tabbar, avatar, toast, choose, confirmDanger, spinner } from './ui.js';
import { session, isAdmin, logout, watchMembers, approveMember, setRole, removeMember, changeMyName } from './auth.js';
import { importCalendar, events, watchEvents } from './store.js';
import { TEST_MODE } from './config.js';
import { CHANGELOG, VERSION } from './version.js';
import { THEMES, currentTheme, applyTheme, preloadAllFonts } from './theme.js';

export function render(root) {
  const admin = isAdmin();
  const me = session.member;
  let members = null;

  root.innerHTML = `<div class="screen">
    <div class="top"><div><div class="h1">Parta</div><div class="sub">${admin ? 'Jsi správce' : 'Člen party'}</div></div></div>
    <div class="scroll">
      <div class="card" style="display:flex;align-items:center;gap:14px">
        ${avatar(me.name, 48)}
        <div style="flex:1;min-width:0"><div style="font-weight:700;font-size:17px">${esc(me.name)}</div><div class="sub" style="overflow:hidden;text-overflow:ellipsis">${esc(session.user.email || '')}</div></div>
        <button class="ibtn" data-rename aria-label="Změnit jméno">${icon('edit')}</button>
      </div>

      <div class="section-h">Vzhled</div>
      <div class="themes" role="radiogroup" aria-label="Styl vzhledu" data-themes></div>
      <div class="note" style="margin-top:8px">Volba platí v tomhle zařízení.</div>

      ${admin ? `<div class="section-h">Akce</div>
      <div class="card" style="display:flex;flex-direction:column;gap:10px">
        <div style="font-weight:700">Import z Google Kalendáře</div>
        <div class="sub" style="line-height:1.45">Převezme všechny akce z kalendáře party (i proběhlé) se stejným id, takže se k nim připojí docházka, komentáře, věci a alba. Jde pouštět opakovaně — jen aktualizuje.</div>
        <div class="sub" data-evcount></div>
        <button class="btn primary" data-import>${icon('download', 18)}Importovat akce</button>
        <div class="sub" data-impstatus role="status"></div>
      </div>` : ''}

      <div class="section-h" data-memh>Členové</div>
      <div data-members>${spinner()}</div>

      <div class="section-h">Účet</div>
      <button class="btn block" data-out>${icon('logout', 18)}Odhlásit se</button>

      <div class="card changelog" style="margin-top:22px">
        <div class="cl-h">KoKrŠNeK · verze ${esc(VERSION)}</div>
        ${TEST_MODE ? '<div class="sub" style="margin-top:2px">Zkušební provoz</div>' : ''}
        <div class="cl-sub">Novinky v této verzi:</div>
        <ul>${CHANGELOG[0].items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        ${CHANGELOG.length > 1 ? `<button class="cl-more" data-older aria-expanded="false">Starší verze</button>
        <div data-olderlist hidden>${CHANGELOG.slice(1).map((v) => `<div class="cl-v">${esc(v.version)}${v.date ? ` <span>${esc(v.date)}</span>` : ''}</div><ul>${v.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`).join('')}</div>` : ''}
      </div>
    </div>
    ${tabbar('parta')}
  </div>`;

  // Výběr stylu: každý náhled je ve vlastních barvách a písmu.
  preloadAllFonts();
  const themesEl = root.querySelector('[data-themes]');
  const drawThemes = () => {
    const cur = currentTheme().id;
    themesEl.innerHTML = THEMES.map((t) => `<button class="theme-opt ${t.id === cur ? 'on' : ''}" role="radio" aria-checked="${t.id === cur}" data-theme-id="${t.id}">
        <span class="sw" style="background:${t.bg};color:${t.ink};font-family:'${t.font}',sans-serif;font-weight:800">
          <span>${esc(t.name)}</span>
          <span style="display:flex;gap:6px"><i style="flex:2;background:${t.a}"></i><i style="flex:1;background:${t.b}"></i></span>
        </span>
        <span>${esc(t.name)} <small>· ${esc(t.note)}</small></span>
      </button>`).join('');
    themesEl.querySelectorAll('[data-theme-id]').forEach((b) => { b.onclick = () => { applyTheme(b.dataset.themeId); drawThemes(); }; });
  };
  drawThemes();

  const olderBtn = root.querySelector('[data-older]');
  if (olderBtn) olderBtn.onclick = () => {
    const list = root.querySelector('[data-olderlist]');
    list.hidden = !list.hidden;
    olderBtn.setAttribute('aria-expanded', String(!list.hidden));
  };

  root.querySelector('[data-out]').onclick = async () => {
    const v = await choose({ title: 'Odhlásit se?', buttons: [{ label: 'Odhlásit', value: true, kind: 'no' }, { label: 'Zrušit', value: false }] });
    if (v) logout();
  };
  root.querySelector('[data-rename]').onclick = async () => {
    const n = prompt('Jméno v partě (podle něj se páruje docházka a komentáře):', me.name);
    if (n == null || !n.trim() || n.trim() === me.name) return;
    if (n.includes('/')) { toast('Jméno nesmí obsahovat lomítko.'); return; }
    try { await changeMyName(n); toast('Jméno změněno — projeví se po obnovení.'); } catch (e) { toast('Nepovedlo se.'); }
  };

  const unsubs = [];
  if (admin) {
    const cnt = root.querySelector('[data-evcount]');
    unsubs.push(watchEvents(() => {
      const g = events.list.filter((e) => e.source === 'gcal').length;
      const t = events.list.filter((e) => e.isTest).length;
      cnt.textContent = `Teď v nové aplikaci: ${g} akcí z kalendáře, ${t} testovacích.`;
    }));
    const btn = root.querySelector('[data-import]');
    const st = root.querySelector('[data-impstatus]');
    btn.onclick = async () => {
      btn.disabled = true;
      st.textContent = 'Stahuju z Google Kalendáře…';
      try {
        const r = await importCalendar((m) => { st.textContent = m; });
        st.textContent = `Hotovo: ${r.total} akcí (${r.added} nových, ${r.updated} aktualizovaných).`;
      } catch (e) {
        console.error(e);
        st.textContent = 'Import selhal: ' + (e.code || e.message);
      }
      btn.disabled = false;
    };
  }

  const memEl = root.querySelector('[data-members]');
  function drawMembers() {
    if (members === null) { memEl.innerHTML = '<div class="sub">Seznam členů se nepodařilo načíst.</div>'; return; }
    const pending = members.filter((m) => m.status !== 'approved');
    const approved = members.filter((m) => m.status === 'approved').sort((a, b) => a.name.localeCompare(b.name, 'cs'));
    const line = (m, btns) => `<div class="row" style="cursor:default">
        ${avatar(m.name)}
        <div style="min-width:0;flex:1"><div class="t">${esc(m.name)}${m.role === 'admin' ? ' <span class="pill go" style="height:20px;font-size:11px">správce</span>' : ''}</div>
          <div class="s" style="overflow:hidden;text-overflow:ellipsis">${esc(m.email || '')}${m.createdAt ? ' · ' + esc(fmtStamp(m.createdAt)) : ''}</div></div>
        ${btns}
      </div>`;
    let html = '';
    if (admin && pending.length) {
      html += `<div class="sub" style="margin-bottom:8px;color:var(--coral-text);font-weight:700">Čekají na schválení (${pending.length})</div>`;
      html += pending.map((m) => line(m, `<div style="display:flex;gap:6px">
        <button class="btn yes" style="height:38px;padding:0 12px" data-ok="${esc(m.id)}">Přijmout</button>
        <button class="ibtn" style="width:38px;height:38px" data-rm="${esc(m.id)}" aria-label="Zamítnout">${icon('close', 18)}</button></div>`)).join('');
      html += '<div style="height:8px"></div>';
    }
    const dupes = new Set(approved.map((m) => m.name).filter((n, i, a) => a.indexOf(n) !== i));
    html += approved.map((m) => line(m, admin && m.id !== session.user.uid ? `<button class="ibtn" style="width:38px;height:38px" data-menu="${esc(m.id)}" aria-label="Možnosti">⋯</button>` : (dupes.has(m.name) ? '<span class="pill no">stejné jméno</span>' : ''))).join('');
    memEl.innerHTML = html || '<div class="sub">Zatím nikdo.</div>';
    root.querySelector('[data-memh]').textContent = `Členové (${approved.length})`;

    memEl.querySelectorAll('[data-ok]').forEach((b) => { b.onclick = () => approveMember(b.dataset.ok).then(() => toast('Přijato')).catch(() => toast('Nepovedlo se.')); });
    memEl.querySelectorAll('[data-rm]').forEach((b) => {
      b.onclick = async () => { if (await confirmDanger('Zamítnout žádost?', 'Člověk se může přihlásit znovu a požádat znovu.', 'Zamítnout')) removeMember(b.dataset.rm).catch(() => toast('Nepovedlo se.')); };
    });
    memEl.querySelectorAll('[data-menu]').forEach((b) => {
      b.onclick = async () => {
        const m = members.find((x) => x.id === b.dataset.menu);
        const v = await choose({ title: m.name, text: m.email || '', buttons: [
          { label: m.role === 'admin' ? 'Odebrat správce' : 'Udělat správcem', value: 'role' },
          { label: 'Odebrat z party', value: 'rm', kind: 'no' },
          { label: 'Zrušit', value: null }
        ] });
        try {
          if (v === 'role') await setRole(m.id, m.role === 'admin' ? 'member' : 'admin');
          if (v === 'rm' && await confirmDanger(`Odebrat ${m.name}?`, 'Ztratí přístup do nové aplikace.', 'Odebrat')) await removeMember(m.id);
        } catch (e) { toast('Nepovedlo se.'); }
      };
    });
  }
  unsubs.push(watchMembers((list) => { members = list; drawMembers(); }));

  return () => unsubs.forEach((u) => u());
}
