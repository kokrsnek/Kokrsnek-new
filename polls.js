// Ankety party — stejná kolekce jako stará aplikace: polls/{id}
// { question, options[], votes{jméno: index}, createdBy, createdAt, closed }.
import { db, collection, doc, query, orderBy, onSnapshot, addDoc, updateDoc } from './firebase.js';
import { esc, icon } from './util.js';
import { toast, avatar, confirmDanger, spinner } from './ui.js';
import { myName, isAdmin } from './auth.js';

export function watchPolls(cb) {
  return onSnapshot(query(collection(db, 'polls'), orderBy('createdAt', 'desc')),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => cb([]));
}

// Krátký přehled pro seznam chatu (otevřené ankety nahoře).
export function pollRows(polls) {
  const me = myName();
  const open = polls.filter((p) => !p.closed).slice(0, 5);
  const closed = polls.filter((p) => p.closed).slice(0, 3);
  const row = (p) => {
    const n = Object.keys(p.votes || {}).length;
    const voted = (p.votes || {})[me] != null;
    return `<a class="row" href="#/anketa/${encodeURIComponent(p.id)}">
      <span class="av" style="background:var(--surface);color:var(--accent-text)">📊</span>
      <div style="min-width:0;flex:1"><div class="t" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.question)}</div>
        <div class="s">${p.closed ? 'uzavřená · ' : ''}${n} ${n === 1 ? 'hlas' : n >= 2 && n <= 4 ? 'hlasy' : 'hlasů'} · ${esc(p.createdBy || '')}</div></div>
      <div class="r">${p.closed ? '' : voted ? '<span class="pill go">hlasoval</span>' : '<span class="pill" style="background:var(--coral);color:#fff">hlasuj</span>'}</div>
    </a>`;
  };
  return `<div class="section-h" style="display:flex;justify-content:space-between;align-items:center">Ankety<button class="link" data-newpoll>+ Nová anketa</button></div>
    ${open.length || closed.length ? [...open, ...closed].map(row).join('') : '<div class="sub" style="padding:0 2px 6px">Zatím žádná anketa.</div>'}`;
}

export function newPollSheet() {
  const bd = document.createElement('div');
  bd.className = 'backdrop';
  let opts = ['', ''];
  const draw = () => {
    bd.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div><h3>Nová anketa</h3>
      <div class="field"><input class="input" data-q placeholder="Otázka" maxlength="200" value="${esc(bd.querySelector('[data-q]')?.value || '')}"></div>
      <div data-opts style="display:flex;flex-direction:column;gap:8px;margin:10px 0">${opts.map((o, i) => `<input class="input" data-o="${i}" placeholder="Možnost ${i + 1}" maxlength="100" value="${esc(o)}">`).join('')}</div>
      ${opts.length < 8 ? '<button class="btn block" data-add style="margin-bottom:10px">+ Další možnost</button>' : ''}
      <div style="display:flex;flex-direction:column;gap:10px"><button class="btn primary big block" data-create>Vytvořit</button><button class="btn block" data-x>Zrušit</button></div></div>`;
  };
  draw();
  const read = () => { opts = [...bd.querySelectorAll('[data-o]')].map((i) => i.value); };
  bd.addEventListener('click', async (e) => {
    if (e.target === bd || e.target.closest('[data-x]')) return bd.remove();
    if (e.target.closest('[data-add]')) { const q = bd.querySelector('[data-q]').value; read(); opts.push(''); draw(); bd.querySelector('[data-q]').value = q; return; }
    if (e.target.closest('[data-create]')) {
      const question = bd.querySelector('[data-q]').value.trim();
      read();
      const options = opts.map((o) => o.trim()).filter(Boolean);
      if (!question) return toast('Napiš otázku.');
      if (options.length < 2) return toast('Zadej aspoň dvě možnosti.');
      try {
        const ref = await addDoc(collection(db, 'polls'), { question, options, votes: {}, createdBy: myName(), createdAt: new Date().toISOString(), closed: false, via: 'v2' });
        bd.remove();
        location.hash = '#/anketa/' + encodeURIComponent(ref.id);
      } catch (x) { console.error(x); toast('Anketu se nepodařilo vytvořit.'); }
    }
  });
  document.body.appendChild(bd);
}

export function renderPoll(root, { id }) {
  const me = myName();
  root.innerHTML = `<div class="screen">
    <div class="top"><a class="ibtn" href="#/chat" aria-label="Zpět">${icon('back')}</a><div style="flex:1;min-width:0"><div class="h1" style="font-size:20px">Anketa</div></div></div>
    <div class="scroll" data-body>${spinner()}</div></div>`;
  const body = root.querySelector('[data-body]');
  let p = null;
  const draw = () => {
    if (!p) { body.innerHTML = '<div class="empty">Anketa nenalezena.</div>'; return; }
    const votes = p.votes || {};
    const total = Object.keys(votes).length;
    const mine = votes[me];
    const showRes = mine != null || p.closed;
    body.innerHTML = `<div class="card">
      <div class="title" style="font-size:22px;margin-bottom:4px">${esc(p.question)}</div>
      <div class="sub" style="margin-bottom:14px">${esc(p.createdBy || '')} · ${total} ${total === 1 ? 'hlas' : total >= 2 && total <= 4 ? 'hlasy' : 'hlasů'}${p.closed ? ' · uzavřená' : ''}</div>
      <div style="display:flex;flex-direction:column;gap:10px">${p.options.map((o, i) => {
        const who = Object.keys(votes).filter((n) => votes[n] === i);
        const pct = total ? Math.round(who.length / total * 100) : 0;
        return `<button class="pollopt ${mine === i ? 'on' : ''}" data-v="${i}" ${p.closed ? 'disabled' : ''}>
          ${showRes ? `<i style="width:${pct}%"></i>` : ''}
          <span class="po-t">${mine === i ? '✓ ' : ''}${esc(o)}</span>${showRes ? `<span class="po-n">${who.length} · ${pct} %</span>` : ''}
          ${showRes && who.length ? `<span class="po-w">${who.map((n) => avatar(n, 20)).join('')}</span>` : ''}
        </button>`;
      }).join('')}</div>
      ${!p.closed && (p.createdBy === me || isAdmin()) ? '<button class="btn block" data-close style="margin-top:16px">Uzavřít anketu</button>' : ''}
    </div>`;
  };
  const unsub = onSnapshot(doc(db, 'polls', id), (s) => { p = s.exists() ? { id: s.id, ...s.data() } : null; draw(); }, () => { p = null; draw(); });
  body.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-v]');
    if (b && p && !p.closed) {
      try { await updateDoc(doc(db, 'polls', id), { ['votes.' + me]: +b.dataset.v }); } catch (x) { toast('Hlas se nepodařilo uložit.'); }
      return;
    }
    if (e.target.closest('[data-close]') && await confirmDanger('Uzavřít anketu?', 'Hlasovat už pak nepůjde.', 'Uzavřít')) {
      updateDoc(doc(db, 'polls', id), { closed: true }).catch(() => toast('Nepovedlo se.'));
    }
  });
  return unsub;
}
