// Parta: můj účet, schvalování členů, import akcí, odhlášení.
import { esc, icon, fmtStamp } from './util.js';
import { tabbar, avatar, toast, choose, confirmDanger, spinner, avatarImage } from './ui.js';
import { session, isAdmin, logout, watchMembers, approveMember, setRole, removeMember, changeMyName } from './auth.js';
import { importCalendar, events, watchEvents, setMyAvatar } from './store.js';
import { TEST_MODE, PARTY_NAMES, LIVE, nameLabel } from './config.js';
import { db, doc, updateDoc, callFunction } from './firebase.js';
import { demoBadges } from './badges.js';
import { weatherDiag, recheckWeather, demoWeather } from './weather.js';
import { CHANGELOG, VERSION } from './version.js';
import { showIntro } from './intro.js';
import { maybeOfferCheckin } from './kde.js';
import { isPushOn, pushToggle } from './pushui.js';
import { THEMES, currentTheme, applyTheme, preloadAllFonts, currentMode, setMode, MODES } from './theme.js';

export function render(root) {
  const admin = isAdmin();
  const me = session.member;
  let members = null;

  root.innerHTML = `<div class="screen">
    <div class="top"><a class="ibtn" href="#/akce" aria-label="Zpět">${icon('back')}</a><div style="flex:1;min-width:0"><div class="h1">Parta</div><div class="sub">${admin ? 'Jsi správce' : 'Člen party'}</div></div></div>
    <div class="scroll">
      <div class="card" style="display:flex;align-items:center;gap:14px">
        <button class="avbtn" data-avatar aria-label="Profilová fotka">${avatar(me.name, 52)}<span class="avcam">${icon('photo', 13, 2.4)}</span></button><input type="file" accept="image/*" data-avfile hidden>
        <div style="flex:1;min-width:0"><div style="font-weight:700;font-size:17px">${esc(me.name)}</div><div class="sub" style="overflow:hidden;text-overflow:ellipsis">${esc(session.user.email || '')}</div></div>
        <button class="ibtn" data-rename aria-label="Změnit jméno">${icon('edit')}</button>
      </div>

      <div class="section-h">Notifikace</div>
      <button class="btn block" data-push style="justify-content:space-between"><span style="display:inline-flex;gap:8px;align-items:center">${icon('bell', 18)}Notifikace v tomhle telefonu</span><b data-pushstate>${isPushOn() ? 'zapnuté' : 'vypnuté'}</b></button>
      <div class="note" style="margin-top:8px">Lajky, Jdu, komentáře, zprávy v chatu, hry, nová alba… Když máš zapnuté obě aplikace, chodí upozornění jen do nové.</div>
      ${admin ? `<button class="btn block" data-testpush style="margin-top:10px;justify-content:flex-start;gap:8px">🧪 Poslat si zkušební notifikace</button>
      <div class="note" style="margin-top:6px">Jen pro správce: přijdou jen na tvoje zařízení (chat, check-in, nová akce).</div>
      <button class="btn block" data-wxdemo style="margin-top:10px;justify-content:flex-start;gap:8px">❄️ Vyzkoušet sníh (20 s)</button>
      <button class="btn block" data-ciofr style="margin-top:10px;justify-content:flex-start;gap:8px">📍 Vyzkoušet nabídku check-inu</button>
      <div class="note" style="margin-top:6px" data-wxdiag></div>` : ''}

      <div class="section-h">Vzhled</div>
      <button class="themerow" data-themerow aria-label="Změnit vzhled"></button>
      <div class="modeseg" role="radiogroup" aria-label="Tmavý nebo světlý režim" data-modes style="margin-top:10px"></div>
      <div class="note" style="margin-top:8px">Volba platí v tomhle zařízení.</div>

      ${admin && !LIVE ? `<div class="section-h">Akce</div>
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
      <button class="btn block" data-intro style="margin-top:10px">🐌 Přehrát úvodní animaci</button>

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

  // Vzhled: v nastavení jen jeden řádek s náhledem, výběr všech vzhledů vyjede zespodu.
  // Každý náhled je ve vlastních barvách a písmu; vybraný se použije hned.
  preloadAllFonts();
  const swatch = (t, cls = '') => `<span class="sw ${cls}" style="background:${t.bg};color:${t.ink};font-family:'${t.font}',sans-serif;font-weight:800">
      <span>${esc(t.name)}</span>
      <span style="display:flex;gap:5px"><i style="flex:2;background:${t.a}"></i><i style="flex:1;background:${t.b}"></i></span></span>`;
  const rowEl = root.querySelector('[data-themerow]');
  const drawThemes = () => {
    const t = currentTheme();
    rowEl.innerHTML = `${swatch(t, 'mini')}<span class="tx"><b>${esc(t.name)}</b><small>${esc(t.note)}</small></span><span class="chg">Změnit ›</span>`;
    // Tmavý / Světlý / Podle telefonu — jen u Původního vzhledu.
    const modesEl = root.querySelector('[data-modes]');
    const m = currentMode();
    modesEl.hidden = t.id !== 'puvodni';
    modesEl.innerHTML = MODES.map(([k, l]) => `<button role="radio" aria-checked="${k === m}" class="${k === m ? 'on' : ''}" data-mode-id="${k}">${l}</button>`).join('');
    modesEl.querySelectorAll('[data-mode-id]').forEach((b) => { b.onclick = () => { setMode(b.dataset.modeId); drawThemes(); }; });
  };
  rowEl.onclick = () => {
    const bd = document.createElement('div');
    bd.className = 'backdrop';
    bd.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Vzhled"><div class="grab"></div>
      <h3>Vzhled</h3>
      <div class="themes3" role="radiogroup" aria-label="Styl vzhledu" data-list></div>
      <button class="btn primary block" data-done style="margin-top:14px">Hotovo</button></div>`;
    const list = bd.querySelector('[data-list]');
    const draw = () => {
      const cur = currentTheme().id;
      list.innerHTML = THEMES.map((t) => `<button class="theme-opt ${t.id === cur ? 'on' : ''}" role="radio" aria-checked="${t.id === cur}" data-theme-id="${t.id}">
          ${swatch(t)}<span>${t.id === cur ? '✓ ' : ''}${esc(t.name)}</span></button>`).join('');
    };
    list.onclick = (e) => { const b = e.target.closest('[data-theme-id]'); if (!b) return; applyTheme(b.dataset.themeId); draw(); drawThemes(); };
    const close = () => bd.remove();
    bd.addEventListener('click', (e) => { if (e.target === bd) close(); });
    bd.querySelector('[data-done]').onclick = close;
    draw();
    document.body.appendChild(bd);
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
  // Profilová fotka: klepnutí na avatar → vybrat novou / odebrat.
  const avFile = root.querySelector('[data-avfile]');
  root.querySelector('[data-avatar]').onclick = async () => {
    if (!avatarImage(me.name)) { avFile.click(); return; }
    const v = await choose({ title: 'Profilová fotka', buttons: [
      { label: 'Vybrat jinou fotku', value: 'pick', kind: 'primary' },
      { label: 'Odebrat fotku', value: 'del', kind: 'no' },
      { label: 'Zrušit', value: null }
    ] });
    if (v === 'pick') avFile.click();
    if (v === 'del') { try { await setMyAvatar(null); toast('Fotka odebrána'); } catch (x) { toast('Nepovedlo se.'); } }
  };
  avFile.onchange = async () => {
    const f = avFile.files && avFile.files[0];
    avFile.value = '';
    if (!f) return;
    try {
      toast('Nahrávám fotku…');
      const img = await squarePhoto(f, 256);
      await setMyAvatar(img);
      toast('Profilová fotka uložena');
    } catch (x) { console.error(x); toast('Fotku se nepodařilo uložit.'); }
  };

  root.querySelector('[data-intro]').onclick = () => showIntro(true);
  const wd = root.querySelector('[data-wxdiag]');
  if (wd) {
    const showDiag = () => {
      const d = weatherDiag();
      const t = d && d.at ? new Date(d.at).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : '';
      const rm = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'Pozor: na zařízení je zapnuté „Omezit pohyb“, proto se sníh/déšť nezobrazuje. ' : '';
      wd.textContent = rm + (!d ? 'Počasí pro sníh/déšť se zatím nezjišťovalo.'
        : d.err ? `Počasí pro sníh/déšť (${t}): ${d.err}.`
        : `Počasí pro sníh/déšť (${t}): kód ${d.code}, sníh ${d.snow} cm, déšť ${d.rain} mm → ${d.kind === 'nic' ? 'bez efektu' : d.kind}.`);
    };
    showDiag(); recheckWeather(); setTimeout(showDiag, 4000);
    root.querySelector('[data-wxdemo]').onclick = () => demoWeather('snow');
    // Nabídka check-inu na známém místě — bez omezení jednou denně a bez kontroly aktuálního check-inu.
    root.querySelector('[data-ciofr]').onclick = () => { toast('Zjišťuju polohu…'); maybeOfferCheckin(true); };
  }
  const tp = root.querySelector('[data-testpush]');
  if (tp) tp.onclick = async () => {
    const delay = await choose({ title: 'Zkušební notifikace', text: 'Přijdou 3 ukázky (chat, check-in, nová akce) jen na tvoje zařízení a na minutu se rozsvítí odznaky v dolní liště (jen u tebe). Se zpožděním stihneš zavřít aplikaci a uvidíš i číslo na ikoně.', buttons: [
      { label: 'Poslat za 15 s', value: 15, kind: 'primary' }, { label: 'Poslat hned', value: 0 }, { label: 'Zrušit', value: null }] });
    if (delay == null) return;
    tp.disabled = true;
    toast(delay ? 'Za 15 s přijdou zkušební notifikace — můžeš zavřít aplikaci.' : 'Posílám zkušební notifikace…');
    // Odznaky v dolní liště naoko na minutu (jen v tomhle telefonu) — spolu s notifikacemi.
    setTimeout(() => demoBadges(60000), delay * 1000);
    try { const r = await callFunction('sendTestNotifications', { kind: 'all', delay }); toast(`Odesláno ${r.sent} notifikace na ${r.devices} zař. ✅`); }
    catch (x) { console.error(x); toast(x && x.message && !/internal/i.test(x.message) ? x.message : 'Nepodařilo se poslat — je nasazená funkce ve Firebase?'); }
    finally { tp.disabled = false; }
  };
  root.querySelector('[data-push]').onclick = async () => { await pushToggle(null); root.querySelector('[data-pushstate]').textContent = isPushOn() ? 'zapnuté' : 'vypnuté'; };

  root.querySelector('[data-rename]').onclick = async () => {
    const n = prompt('Jméno v partě (podle něj se páruje docházka a komentáře):', me.name);
    if (n == null || !n.trim() || n.trim() === me.name) return;
    if (n.includes('/')) { toast('Jméno nesmí obsahovat lomítko.'); return; }
    try { await changeMyName(n); toast('Jméno změněno — projeví se po obnovení.'); } catch (e) { toast('Nepovedlo se.'); }
  };

  const unsubs = [];
  if (admin && !LIVE) {
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
        <span data-profile="${esc(m.name)}">${avatar(m.name)}</span>
        <div style="min-width:0;flex:1"><div class="t"><span data-profile="${esc(m.name)}">${esc(m.name)}</span>${m.role === 'admin' ? ' <span class="pill go" style="height:20px;font-size:11px">správce</span>' : ''}</div>
          <div class="s" style="overflow:hidden;text-overflow:ellipsis">${esc(m.email || '')}${m.createdAt ? ' · ' + esc(fmtStamp(m.createdAt)) : ''}</div></div>
        ${btns}
      </div>`;
    let html = '';
    if (admin && pending.length) {
      html += `<div class="sub" style="margin-bottom:8px;color:var(--coral-text);font-weight:700">Čekají na schválení (${pending.length})</div>`;
      // U žádosti: je to jméno ze staré aplikace? Nemá ho už někdo schválený?
      const lc = (n) => String(n || '').trim().toLocaleLowerCase('cs');
      const oldIdx = new Map(PARTY_NAMES.map((n) => [lc(n), n]));
      html += pending.map((m) => {
        const taken = approved.find((a) => lc(a.name) === lc(m.name));
        const old = oldIdx.get(lc(m.name));
        const tag = taken
          ? `<div class="mtag bad">⚠ Jméno ${esc(m.name)} už má schválený člen${taken.email ? ' (' + esc(taken.email) + ')' : ''}</div>`
          : old
            ? `<div class="mtag ok">✓ Ze staré aplikace: <b>${esc(old)}</b> — převezme jeho docházku, chaty a upozornění</div>`
            : `<div class="mtag warn">⚠ Nové jméno — ve staré aplikaci není. Pokud ji používal, změň mu jméno.</div>`;
        return `<div class="pendwrap">${line(m, `<div style="display:flex;gap:6px">
        <button class="btn yes" style="height:38px;padding:0 12px" data-ok="${esc(m.id)}"${taken ? ' disabled' : ''}>Přijmout</button>
        <button class="ibtn" style="width:38px;height:38px" data-rm="${esc(m.id)}" aria-label="Zamítnout">${icon('close', 18)}</button></div>`)}
        ${tag}<button class="link mrename" data-rename="${esc(m.id)}">Změnit jméno před přijetím</button></div>`;
      }).join('');
      html += '<div style="height:8px"></div>';
    }
    const dupes = new Set(approved.map((m) => m.name).filter((n, i, a) => a.indexOf(n) !== i));
    html += approved.map((m) => line(m, admin && m.id !== session.user.uid ? `<button class="ibtn" style="width:38px;height:38px" data-menu="${esc(m.id)}" aria-label="Možnosti">⋯</button>` : (dupes.has(m.name) ? '<span class="pill no">stejné jméno</span>' : ''))).join('');
    memEl.innerHTML = html || '<div class="sub">Zatím nikdo.</div>';
    root.querySelector('[data-memh]').textContent = `Členové (${approved.length})`;

    memEl.querySelectorAll('[data-ok]').forEach((b) => { b.onclick = () => approveMember(b.dataset.ok).then(() => toast('Přijato')).catch(() => toast('Nepovedlo se.')); });
    memEl.querySelectorAll('[data-rename]').forEach((b) => {
      b.onclick = async () => {
        const m = members.find((x) => x.id === b.dataset.rename);
        const lc = (n) => String(n || '').trim().toLocaleLowerCase('cs');
        const used = new Set(approved.map((a) => lc(a.name)));
        const free = PARTY_NAMES.filter((n) => !used.has(lc(n)));
        const v = await new Promise((res) => {
          const bd = document.createElement('div');
          bd.className = 'backdrop';
          bd.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>
            <h3 style="text-align:center;overflow-wrap:anywhere">Jméno pro ${esc(m.email || m.name)}</h3>
            <p class="sub" style="text-align:center;margin-top:-4px">Vyber jméno, pod kterým byl ve staré aplikaci. Zabraná jména tu nejsou.</p>
            <div class="namegrid">${free.map((n) => `<button class="chip${n === m.name ? ' on' : ''}" data-n="${esc(n)}">${avatar(n, 24)}${esc(nameLabel(n))}</button>`).join('')}</div>
            <button class="btn block" data-x style="margin-top:14px">Zrušit</button></div>`;
          bd.addEventListener('click', (e) => {
            const c = e.target.closest('[data-n]');
            if (c) { bd.remove(); res(c.dataset.n); } else if (e.target === bd || e.target.closest('[data-x]')) { bd.remove(); res(null); }
          });
          document.body.appendChild(bd);
        });
        if (!v || v === m.name) return;
        try { await updateDoc(doc(db, 'v2_members', m.id), { name: v }); toast('Jméno změněno na ' + v); } catch (e) { toast('Nepovedlo se.'); }
      };
    });
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

// Čtvercový výřez ze středu fotky, zmenšený JPEG (do ~60 kB).
function squarePhoto(file, side) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      const s = Math.min(im.naturalWidth, im.naturalHeight);
      const c = document.createElement('canvas');
      c.width = c.height = side;
      c.getContext('2d').drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, 0, 0, side, side);
      URL.revokeObjectURL(url);
      let q = 0.85, out = c.toDataURL('image/jpeg', q);
      while (out.length > 80000 && q > 0.4) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
      resolve(out);
    };
    im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Fotku se nepodařilo načíst')); };
    im.src = url;
  });
}
