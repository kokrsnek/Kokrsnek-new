// Nová / upravit akci. Ve zkušebním provozu vznikají jen testovací akce.
import { esc, icon, pad2 } from './util.js';
import { toast, confirmDanger, spinner } from './ui.js';
import { myName, isAdmin } from './auth.js';
import { watchEvents, findEvent, events, saveEvent, deleteEvent } from './store.js';
import { TEST_MODE, LIVE } from './config.js';

const dStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const tStr = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

export function render(root, { id }) {
  let drawn = false;
  root.innerHTML = `<div class="screen">${spinner()}</div>`;

  function draw(ev) {
    drawn = true;
    const base = new Date(); base.setDate(base.getDate() + 7); base.setHours(18, 0, 0, 0);
    const s = ev ? ev.start : base;
    const e = ev ? ev.end : new Date(base.getTime() + 4 * 3600000);
    const allDay = ev ? ev.allDay : false;
    const endDay = ev && ev.allDay ? new Date(e.getTime() - 86400000) : e;
    root.innerHTML = `<div class="screen" style="padding-top:var(--safe-top)">
      <div class="sheethead">
        <a class="side" href="${ev ? '#/akce/' + encodeURIComponent(ev.id) : '#/akce'}">Zrušit</a>
        <div class="t">${ev ? 'Upravit akci' : 'Nová akce'}</div>
        <button class="side r" data-save>Uložit</button>
      </div>
      <form class="form" novalidate>
        ${ev || LIVE ? '' : isAdmin()
          ? `<label class="banner" style="margin:0;display:flex;gap:10px;align-items:center"><input type="checkbox" name="isTest"><span><b>Jen testovací</b> — uvidí ji jen nová aplikace a parta nedostane notifikaci. Bez zaškrtnutí je akce naostro pro celou partu (stará aplikace ji neuvidí, ta bere akce jen z Google Kalendáře).</span></label>`
          : `<div class="banner" style="margin:0">${icon('lock', 18)}<span>Akce se uloží jako testovací — naostro je zakládá jen správce.</span></div>`}
        <div class="field"><label for="f-title">Název</label><input id="f-title" class="input" name="title" maxlength="120" value="${esc(ev?.title || '')}" placeholder="Např. Grilovačka u Pifa"></div>
        <div class="group">
          <label>Celý den <input type="checkbox" name="allDay" ${allDay ? 'checked' : ''}></label>
          <label>Začátek <span style="display:flex;gap:6px"><input type="date" name="sd" value="${dStr(s)}"><input type="time" name="st" value="${tStr(s)}" data-time></span></label>
          <label>Konec <span style="display:flex;gap:6px"><input type="date" name="ed" value="${dStr(endDay)}"><input type="time" name="et" value="${tStr(e)}" data-time></span></label>
        </div>
        <div class="field"><label for="f-place">Místo</label><input id="f-place" class="input" name="place" maxlength="200" value="${esc(ev?.place || '')}" placeholder="Adresa nebo název místa"></div>
        <div class="field"><label for="f-desc">Popis</label><textarea id="f-desc" class="input" name="description" rows="4" maxlength="4000" placeholder="Co, jak, kdo co bere…">${esc(ev?.description || '')}</textarea></div>
        <div class="field"><label for="f-album">Odkaz na album fotek</label><input id="f-album" class="input" name="photoAlbum" type="url" inputmode="url" value="${esc(ev?.photoAlbum || '')}" placeholder="https://photos.app.goo.gl/…"></div>
        <div class="err" role="alert"></div>
        <button type="submit" class="btn primary big block">Uložit</button>
        ${ev ? `<button type="button" class="btn danger block" data-del>${icon('trash', 18)}Smazat akci</button>` : ''}
      </form>
    </div>`;
    const form = root.querySelector('form');
    const err = root.querySelector('.err');
    const syncTimes = () => root.querySelectorAll('[data-time]').forEach((t) => { t.style.display = form.allDay.checked ? 'none' : ''; });
    form.allDay.onchange = syncTimes; syncTimes();
    form.sd.addEventListener('change', () => { if (form.ed.value < form.sd.value) form.ed.value = form.sd.value; });

    const save = async () => {
      err.textContent = '';
      const title = form.title.value.trim();
      if (!title) { err.textContent = 'Akce potřebuje název.'; form.title.focus(); return; }
      const ad = form.allDay.checked;
      const start = new Date(`${form.sd.value}T${ad ? '00:00' : (form.st.value || '00:00')}`);
      let end;
      if (ad) { end = new Date(`${form.ed.value || form.sd.value}T00:00`); end.setDate(end.getDate() + 1); }
      else end = new Date(`${form.ed.value || form.sd.value}T${form.et.value || form.st.value || '00:00'}`);
      if (isNaN(start) || isNaN(end)) { err.textContent = 'Zkontroluj datum a čas.'; return; }
      if (end < start) { err.textContent = 'Konec je dřív než začátek.'; return; }
      const album = form.photoAlbum.value.trim();
      if (album && !/^https?:\/\//.test(album)) { err.textContent = 'Odkaz na album musí začínat https://'; return; }
      root.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      try {
        const newId = await saveEvent({ title, place: form.place.value, description: form.description.value, start, end, allDay: ad, photoAlbum: album, isTest: !isAdmin() || !!(form.isTest && form.isTest.checked) }, ev?.id || null);
        toast('Uloženo');
        location.replace('#/akce/' + encodeURIComponent(newId));
      } catch (x) {
        console.error(x);
        err.textContent = 'Nepovedlo se uložit (' + (x.code || x.message) + ').';
        root.querySelectorAll('button').forEach((b) => { b.disabled = false; });
      }
    };
    form.onsubmit = (e2) => { e2.preventDefault(); save(); };
    root.querySelector('[data-save]').onclick = save;
    const del = root.querySelector('[data-del]');
    if (del) del.onclick = async () => {
      if (!(await confirmDanger('Smazat akci?', `„${ev.title}“ zmizí i s docházkou a komentáři.`))) return;
      try { await deleteEvent(ev); toast('Smazáno'); location.replace('#/akce'); }
      catch (x) { toast('Nepovedlo se smazat.'); }
    };
  }

  if (!id) { draw(null); return () => {}; }
  const unsub = watchEvents(() => {
    if (drawn) return;
    const ev = findEvent(id);
    if (!ev) { if (events.loaded) root.innerHTML = '<div class="screen"><div class="empty">Akce nenalezena. <a href="#/akce">Zpět</a></div></div>'; return; }
    const editable = (ev.isTest && (ev.createdBy === myName() || isAdmin())) || ((ev.source === 'app' || LIVE) && isAdmin());
    if (!editable) {
      root.innerHTML = `<div class="screen"><div class="empty">Tuhle akci tady upravit nejde${ev.source === 'gcal' ? ' — patří Google Kalendáři (opravuje se tam a pak znovu importuje)' : ''}.<br><a href="#/akce/${encodeURIComponent(ev.id)}">Zpět</a></div></div>`;
      drawn = true;
      return;
    }
    draw(ev);
  });
  return unsub;
}
