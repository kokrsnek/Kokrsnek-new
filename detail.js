// Detail akce: informace, docházka, co přinést, album, soubory, komentáře.
import { esc, icon, fmtWhen, fmtLongDate, fmtTime, sameDay, relDays, fmtStamp } from './util.js';
import { avatar, toast, confirmDanger, spinner } from './ui.js';
import { myName, isAdmin } from './auth.js';
import {
  watchEvents, findEvent, events, isPast, canWrite, watchAttendance, watchComments, addComment,
  deleteComment, watchItems, addItem, toggleItem, loadAlbum, icsFor
} from './store.js';
import { changeAttendance, attendButtons } from './attend.js';
import { albumFlow, canAddAlbum } from './plus.js';

const linkify = (t) => esc(t).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u.length > 40 ? u.slice(0, 38) + '…' : u}</a>`).replace(/\n/g, '<br>');

export function render(root, { id }) {
  let ev = null, att = null, comments = null, items = null, album = null;
  const unsubs = [];
  let started = false;

  root.innerHTML = `<div class="screen">${spinner()}</div>`;

  function shell() {
    const past = isPast(ev);
    const ro = !canWrite(ev);
    const mine = ev.isTest && (ev.createdBy === myName() || isAdmin());
    root.innerHTML = `<div class="screen" style="padding-top:0">
      <div class="cover" data-cover>
        <a class="ibtn l" href="#/akce${past ? '/probehle' : ''}" aria-label="Zpět">${icon('back')}</a>
        <div class="rr">
          <button class="ibtn" data-share aria-label="Sdílet">${icon('share')}</button>
          ${mine ? `<a class="ibtn" href="#/upravit/${encodeURIComponent(ev.id)}" aria-label="Upravit">${icon('edit')}</a>` : ''}
        </div>
        <span data-covertext>${icon('calendar', 44, 1.5)}</span>
      </div>
      <div class="scroll" style="padding-top:18px">
        <div class="eyebrow ${past ? '' : 'live'}" style="color:${past ? 'var(--muted)' : ''}">${past ? 'Proběhlo · ' + esc(relDays(ev.start)) : esc(relDays(ev.start))}${ev.isTest ? ' · testovací akce' : ''}</div>
        <h1 class="title" style="margin:6px 0 14px">${esc(ev.title)}</h1>
        ${ro && !past ? `<div class="banner">${icon('lock', 18)}<span>Zkušební provoz: tahle akce patří starému kalendáři, takže se tu zatím jen čte.</span></div>` : ''}
        <div class="info">
          <div>${icon('calendar')}<div class="k"><b>${esc(fmtLongDate(ev.start))}</b><span>${esc(whenLine(ev))}</span></div><button class="link" data-ics>Do kalendáře</button></div>
          ${ev.place ? `<div>${icon('pin')}<div class="k"><b>${esc(ev.place)}</b></div><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.place)}" target="_blank" rel="noopener">Navigovat</a></div>` : ''}
          <div data-albumrow style="display:none"></div>
          ${(ev.driveFiles || []).map((f) => `<div>${icon('file')}<div class="k"><b>${esc(f.title)}</b></div><a href="${esc(f.url)}" target="_blank" rel="noopener">Otevřít</a></div>`).join('')}
        </div>
        ${ev.description ? `<div class="card" style="margin-top:12px;padding:14px;font-size:14px;line-height:1.5;color:var(--ink2);overflow-wrap:anywhere">${linkify(ev.description)}</div>` : ''}

        <div class="h2"><span>Kdo jde</span><span class="sub" data-attcount></span></div>
        <div data-att>${spinner()}</div>

        <div class="h2"><span>Co přinést</span><span class="sub" data-itemcount></span></div>
        <div data-items>${spinner()}</div>

        <div class="h2"><span>Komentáře</span><span class="sub" data-comcount></span></div>
        <div data-coms>${spinner()}</div>
        ${ro ? '' : `<form class="inrow" data-comform style="margin-top:6px">
          <input class="input" name="t" placeholder="Napiš komentář" aria-label="Komentář" autocomplete="off" maxlength="2000">
          <button class="ibtn" style="background:var(--accent);border:none;color:var(--on-accent);width:48px;height:48px" aria-label="Odeslat">${icon('next', 22, 2.4)}</button>
        </form>`}
      </div>
    </div>`;

    root.querySelector('[data-ics]').onclick = () => {
      const blob = new Blob([icsFor(ev)], { type: 'text/calendar;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (ev.title || 'akce').replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40) + '.ics';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    };
    root.querySelector('[data-share]').onclick = async () => {
      const text = `${ev.title}\n${fmtWhen(ev)}${ev.place ? '\n' + ev.place : ''}`;
      try {
        if (navigator.share) await navigator.share({ title: ev.title, text });
        else { await navigator.clipboard.writeText(text); toast('Zkopírováno'); }
      } catch (e) { /* sdílení zavřeno */ }
    };
    const form = root.querySelector('[data-comform]');
    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      const t = form.t.value.trim();
      if (!t) return;
      form.t.value = '';
      try { await addComment(ev, t); } catch (ex) { form.t.value = t; toast('Komentář se nepodařilo odeslat.'); }
    };

    loadAlbum(ev).then((u) => { album = u; drawAlbum(); });
    unsubs.push(watchAttendance(ev, (a) => { att = a; drawAtt(); }));
    unsubs.push(watchComments(ev, (c) => { comments = c; drawComs(); }));
    unsubs.push(watchItems(ev, (i) => { items = i; drawItems(); }));
  }

  function whenLine(e) {
    if (e.allDay) return fmtWhen(e).split(' · ')[1] === 'celý den' ? 'celý den' : fmtWhen(e);
    if (sameDay(e.start, e.end)) return `${fmtTime(e.start)}${e.end > e.start ? ' – ' + fmtTime(e.end) : ''}`;
    return fmtWhen(e);
  }

  function drawAlbum() {
    const row = root.querySelector('[data-albumrow]');
    if (!row) return;
    if (!album) {
      if (!canAddAlbum(ev) || ev.start > new Date()) return;
      row.style.display = '';
      row.innerHTML = `${icon('photo')}<div class="k"><b>Album fotek</b><span>zatím není</span></div><button class="link" data-addalbum>Přidat album</button>`;
      row.querySelector('[data-addalbum]').onclick = () => albumFlow(ev);
      return;
    }
    row.style.display = '';
    row.innerHTML = `${icon('photo')}<div class="k"><b>Album fotek</b><span>Google Fotky</span></div><a href="${esc(album)}" target="_blank" rel="noopener">Otevřít</a>`;
    const ct = root.querySelector('[data-covertext]');
    if (ct) ct.innerHTML = `<a href="${esc(album)}" target="_blank" rel="noopener" style="display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--cover-ink);text-decoration:none">${icon('photo', 40, 1.5)}<span>Otevřít album</span></a>`;
  }

  function drawAtt() {
    const el = root.querySelector('[data-att]');
    if (!el) return;
    const past = isPast(ev);
    root.querySelector('[data-attcount]').textContent = att.going.length ? `${att.going.length} ${att.going.length === 1 ? 'jde' : (att.going.length < 5 ? 'jdou' : 'jde')}` : '';
    el.innerHTML = `
      ${att.going.length ? `<div class="chips">${att.going.map((n) => `<span class="chip" style="display:inline-flex;align-items:center;gap:6px;padding-left:4px">${avatar(n, 22)}${esc(n)}</span>`).join('')}</div>` : '<div class="sub">Zatím nikdo.</div>'}
      ${att.declined.length ? `<div class="sub" style="margin:10px 0 6px">Nejdou</div><div class="chips">${att.declined.map((n) => `<span class="chip dash">${esc(n)}</span>`).join('')}</div>` : ''}
      ${past ? '' : `<div style="margin-top:14px">${attendButtons(ev, att)}</div>`}`;
    el.querySelectorAll('[data-att]').forEach((b) => { b.onclick = () => changeAttendance(ev, b.dataset.att, att); });
  }

  function drawItems() {
    const el = root.querySelector('[data-items]');
    if (!el) return;
    const me = myName();
    const ro = !canWrite(ev);
    root.querySelector('[data-itemcount]').textContent = items.length ? `${items.filter((i) => i.takenBy).length}/${items.length} zajištěno` : '';
    el.innerHTML = `${items.length ? `<div class="list">${items.map((it) => `<div>
        <span style="min-width:0;overflow-wrap:anywhere">${esc(it.name)}</span>
        ${it.takenBy
          ? `<button class="pill ${it.takenBy === me ? 'go' : ''}" data-item="${esc(it.id)}" style="background:transparent;border:1px solid var(--line2);color:var(--ink2);${it.takenBy === me ? 'border-color:var(--accent-hi);color:var(--accent-text)' : ''}" ${ro || it.takenBy !== me ? 'disabled' : ''}>${esc(it.takenBy)}</button>`
          : `<button class="pill" data-item="${esc(it.id)}" style="background:transparent;border:1px dashed var(--line2);color:var(--muted)" ${ro ? 'disabled' : ''}>Vezmu</button>`}
      </div>`).join('')}</div>` : `<div class="sub">${ro ? 'Seznam je prázdný.' : 'Zatím nic. Přidej, co je potřeba.'}</div>`}
      ${ro ? '' : `<form class="inrow" data-itemform style="margin-top:10px"><input class="input" name="n" placeholder="Přidat věc" aria-label="Přidat věc" maxlength="80"><button class="ibtn" aria-label="Přidat">${icon('plus')}</button></form>`}`;
    el.querySelectorAll('[data-item]').forEach((b) => { b.onclick = () => toggleItem(ev, items.find((i) => i.id === b.dataset.item)).catch(() => toast('Nepovedlo se.')); });
    const f = el.querySelector('[data-itemform]');
    if (f) f.onsubmit = async (e) => { e.preventDefault(); const n = f.n.value.trim(); if (!n) return; f.n.value = ''; try { await addItem(ev, n); } catch (x) { toast('Nepovedlo se přidat.'); } };
  }

  function drawComs() {
    const el = root.querySelector('[data-coms]');
    if (!el) return;
    const me = myName();
    const ro = !canWrite(ev);
    root.querySelector('[data-comcount]').textContent = comments.length ? String(comments.length) : '';
    // Odpovědi hned pod komentář, na který odpovídají.
    const top = comments.filter((c) => !c.parentId || !comments.some((p) => p.id === c.parentId));
    const ordered = [];
    const add = (c) => { ordered.push(c); comments.filter((r) => r.parentId === c.id && !ordered.includes(r)).forEach(add); };
    top.forEach(add);
    el.innerHTML = ordered.length ? ordered.map((c) => `<div class="com" ${c.parentId ? 'style="margin-left:42px"' : ''}>
        ${avatar(c.user || '?', 32)}
        <div class="bub"><b style="font-size:13px">${esc(c.user || '?')}</b><div>${linkify(c.text || '')}</div>
          ${(c.images || []).map((src) => `<img src="${esc(src)}" alt="" loading="lazy">`).join('')}
          <div class="ts">${esc(fmtStamp(c.at))}${!ro && c.user === me ? ` · <button data-del="${esc(c.id)}" style="background:none;border:none;color:var(--muted);padding:0;font-size:11px;text-decoration:underline">smazat</button>` : ''}</div></div>
      </div>`).join('') : '<div class="sub">Zatím žádné komentáře.</div>';
    el.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => { if (await confirmDanger('Smazat komentář?', '')) deleteComment(ev, b.dataset.del).catch(() => toast('Nepovedlo se smazat.')); };
    });
  }

  const unsubEv = watchEvents(() => {
    const found = findEvent(id);
    if (!found) {
      if (events.loaded) root.innerHTML = `<div class="screen"><div class="top"><a class="ibtn" href="#/akce" aria-label="Zpět">${icon('back')}</a></div><div class="empty">Tahle akce neexistuje nebo byla smazána.</div></div>`;
      started = false;
      return;
    }
    const albumChanged = started && found.photoAlbum && found.photoAlbum !== album;
    ev = found;
    if (!started) { started = true; shell(); }
    else if (albumChanged) { album = found.photoAlbum; drawAlbum(); }
  });

  return () => { unsubEv(); unsubs.forEach((u) => u()); };
}
