// Náklady akce a Příspěvek (QR platba) — stejná data jako stará aplikace:
// expensePdfs/{id akce} { eventTitle, eventStart, items[{name,qty,price}],
// contributions[{name,amount}], updatedAt }. Zadává a upravuje správce,
// účtenku a roční přehled vidí všichni.
import { db, doc, getDoc, getDocs, setDoc, collection } from './firebase.js';
import { esc, DAYS_FULL } from './util.js';
import { toast } from './ui.js';
import { isAdmin } from './auth.js';

const ACCOUNT = '1518140045/3030';
const kc = (n) => (Math.round(Number(n) || 0)).toLocaleString('cs-CZ') + ' Kč';

function sheet(html) {
  const bd = document.createElement('div');
  bd.className = 'backdrop';
  bd.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  bd.addEventListener('click', (e) => { if (e.target === bd || e.target.closest('[data-x]')) bd.remove(); });
  document.body.appendChild(bd);
  return bd;
}

export async function loadExpenses(ev) {
  try { const s = await getDoc(doc(db, 'expensePdfs', ev.id)); return s.exists() ? s.data() : null; } catch (e) { return null; }
}

// Příspěvek na akci: QR kód + číslo účtu a zpráva ke zkopírování.
export function showPayment(ev) {
  const msg = 'příspěvek Kokršnekům za ' + (ev.title || 'akci');
  const bd = sheet(`<h3 style="text-align:center">💰 Příspěvek na akci</h3>
    <p style="text-align:center;margin-top:-4px">${esc(ev.title || '')}</p>
    <div style="display:flex;justify-content:center"><img src="qr-platba.png" alt="QR platba" style="width:220px;height:220px;border-radius:14px;background:#fff;padding:6px;-webkit-touch-callout:default"></div>
    <div class="sub" style="text-align:center;margin-top:6px">Podrž prst na QR kódu pro uložení</div>
    <div style="text-align:center;margin:12px 0;line-height:1.7"><b>${ACCOUNT}</b><br>${esc(msg)}</div>
    <div style="display:flex;flex-direction:column;gap:10px"><button class="btn primary big block" data-copy>Zkopírovat platební údaje</button><button class="btn block" data-x>Zavřít</button></div>`);
  bd.querySelector('[data-copy]').onclick = async (e) => {
    try { await navigator.clipboard.writeText(`Účet: ${ACCOUNT}\nZpráva: ${msg}`); e.target.textContent = '✓ Zkopírováno'; } catch (x) { toast('Kopírování se nepovedlo.'); }
  };
}

// Účtenka nákladů.
export function showReceipt(ev, data, onChange) {
  const items = data?.items || [], contribs = data?.contributions || [];
  const total = items.reduce((s, it) => s + (Number(it.price) || 0), 0);
  const tc = contribs.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const bal = tc - total;
  const d = ev.start;
  const bd = sheet(`<div class="receipt">
      <div class="rc-h">🧾 Náklady akce</div>
      <div class="rc-t">${esc(ev.title || '')}</div>
      <div class="rc-d">${d ? `${DAYS_FULL[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}` : ''}</div>
      <div class="rc-rows">${items.map((it) => `<div><span>${esc(it.name)}</span><small>${esc(it.qty || '—')}</small><b>${kc(it.price)}</b></div>`).join('') || '<div class="sub">Bez položek.</div>'}</div>
      <div class="rc-sum"><span>Celkem náklady</span><b>${kc(total)}</b></div>
      ${contribs.length ? `<div class="rc-sub">Přispěli</div><div class="rc-rows">${contribs.map((c) => `<div><span>${esc(c.name)}</span><small></small><b style="color:var(--accent-text)">${kc(c.amount)}</b></div>`).join('')}</div>
      <div class="rc-sum"><span>Celkem příspěvky</span><b>${kc(tc)}</b></div>` : ''}
      <div class="rc-bal ${bal >= 0 ? 'plus' : 'minus'}"><span>${bal >= 0 ? 'V plusu' : 'V mínusu'}</span><b>${bal >= 0 ? '+' : '−'}${kc(Math.abs(bal))}</b></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px">
      ${isAdmin() ? '<button class="btn block" data-edit>Upravit náklady</button>' : ''}
      <button class="btn block" data-year>Přehled roku ${d ? d.getFullYear() : ''}</button>
      <button class="btn block" data-x>Zavřít</button></div>`);
  const eb = bd.querySelector('[data-edit]');
  if (eb) eb.onclick = () => { bd.remove(); editExpenses(ev, data, onChange); };
  bd.querySelector('[data-year]').onclick = () => { bd.remove(); showYear(d ? d.getFullYear() : new Date().getFullYear()); };
}

// Editor (správce). „přispěl(a) JMÉNO“ v položce = příspěvek, ne náklad (jako ve staré aplikaci).
export function editExpenses(ev, data, onChange) {
  const items = (data?.items || []).map((i) => ({ ...i }));
  const contribs = (data?.contributions || []).map((c) => ({ ...c }));
  const bd = sheet(`<h3>🧾 Náklady akce</h3><p style="margin-top:-6px">${esc(ev.title || '')}</p>
    <div data-list class="rc-edit"></div>
    <div class="sub" style="margin:6px 0">Tip: do Položky napiš „přispěl/a JMÉNO“ a do Ceny částku — započítá se jako příspěvek.</div>
    <form data-add style="display:grid;grid-template-columns:2fr 1fr;gap:6px">
      <input class="input" name="n" placeholder="Položka" maxlength="80" autocomplete="off">
      <input class="input" name="q" placeholder="Množství" maxlength="20" autocomplete="off">
      <input class="input" name="p" type="number" inputmode="decimal" placeholder="Cena (Kč)">
      <button class="btn primary" type="submit">Přidat</button>
    </form>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px"><button class="btn primary big block" data-save>Uložit</button><button class="btn block" data-x>Zrušit</button></div>`);
  const list = bd.querySelector('[data-list]');
  const draw = () => {
    list.innerHTML = [...items.map((it, i) => `<div><span>${esc(it.name)}</span><small>${esc(it.qty || '')}</small><b>${kc(it.price)}</b><button data-di="${i}" aria-label="Smazat">✕</button></div>`),
      ...contribs.map((c, i) => `<div class="c"><span>přispěl(a) ${esc(c.name)}</span><small></small><b>${kc(c.amount)}</b><button data-dc="${i}" aria-label="Smazat">✕</button></div>`)].join('') || '<div class="sub">Zatím nic.</div>';
  };
  draw();
  list.addEventListener('click', (e) => {
    const a = e.target.closest('[data-di]'), c = e.target.closest('[data-dc]');
    if (a) { items.splice(+a.dataset.di, 1); draw(); }
    if (c) { contribs.splice(+c.dataset.dc, 1); draw(); }
  });
  bd.querySelector('[data-add]').onsubmit = (e) => {
    e.preventDefault();
    const f = e.target, name = f.n.value.trim(), price = Number(String(f.p.value).replace(',', '.'));
    if (!name || !isFinite(price) || f.p.value === '') { toast('Vyplň položku a cenu.'); return; }
    const m = name.match(/^přispěl[a]?\s+(.+)$/i);
    if (m) contribs.push({ name: m[1].trim(), amount: price });
    else items.push({ name, qty: f.q.value.trim(), price });
    f.reset(); draw(); f.n.focus();
  };
  bd.querySelector('[data-save]').onclick = async () => {
    try {
      const out = { eventTitle: ev.title || '', eventStart: ev.start ? ev.start.toISOString() : '', items, contributions: contribs, updatedAt: new Date().toISOString(), via: 'v2' };
      await setDoc(doc(db, 'expensePdfs', ev.id), out);
      bd.remove();
      toast('Náklady uloženy');
      if (onChange) onChange(out);
      showReceipt(ev, out, onChange);
    } catch (x) { console.error(x); toast('Nepodařilo se uložit.'); }
  };
}

// Roční přehled nákladů a příspěvků.
export async function showYear(year) {
  const bd = sheet(`<h3 style="text-align:center">📅 Náklady za rok ${year}</h3><div data-y class="receipt"><div class="sub" style="text-align:center">Načítám…</div></div><button class="btn block" data-x style="margin-top:12px">Zavřít</button>`);
  const box = bd.querySelector('[data-y]');
  try {
    const s = await getDocs(collection(db, 'expensePdfs'));
    const rows = [];
    s.docs.forEach((d) => {
      const x = d.data();
      if (!x.eventStart) return;
      const dt = new Date(x.eventStart);
      if (dt.getFullYear() !== year) return;
      rows.push({ title: x.eventTitle || '(bez názvu)', dt,
        cost: (x.items || []).reduce((a, it) => a + (Number(it.price) || 0), 0),
        contrib: (x.contributions || []).reduce((a, c) => a + (Number(c.amount) || 0), 0) });
    });
    rows.sort((a, b) => a.dt - b.dt);
    if (!rows.length) { box.innerHTML = `<div class="sub" style="text-align:center">Za rok ${year} zatím žádná akce nemá náklady.</div>`; return; }
    const gc = rows.reduce((a, r) => a + r.cost, 0), gk = rows.reduce((a, r) => a + r.contrib, 0), bal = gk - gc;
    box.innerHTML = `<div class="rc-rows">${rows.map((r) => `<div><span>${esc(r.title)}<br><small>${r.dt.getDate()}. ${r.dt.getMonth() + 1}.</small></span><small style="color:var(--accent-text)">+${kc(r.contrib)}</small><b>−${kc(r.cost)}</b></div>`).join('')}</div>
      <div class="rc-sum"><span>Náklady celkem</span><b>${kc(gc)}</b></div>
      <div class="rc-sum"><span>Příspěvky celkem</span><b>${kc(gk)}</b></div>
      <div class="rc-bal ${bal >= 0 ? 'plus' : 'minus'}"><span>${bal >= 0 ? 'V plusu' : 'V mínusu'}</span><b>${bal >= 0 ? '+' : '−'}${kc(Math.abs(bal))}</b></div>`;
  } catch (e) { box.innerHTML = '<div class="sub">Přehled se nepodařilo načíst.</div>'; }
}
