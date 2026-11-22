// Akce a data k nim.
//
// Akce žijí v kolekci v2_akce/{id}. Akce převzaté z Google Kalendáře mají
// stejné id jako v kalendáři, takže se k nim rovnou připojí všechno, co
// parta už nasbírala ve staré aplikaci: events/{id}/attendees|declines|comments,
// bringLists/{id}/items a photoAlbums/{id}.
//
// Ve zkušebním provozu (TEST_MODE) se data party jen čtou. Testovací akce
// (isTest) mají docházku, komentáře i seznam věcí uvnitř v2_akce/{id}/…,
// takže se stará aplikace ani notifikace ničeho nedotknou.
import {
  db, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc,
  query, orderBy, onSnapshot, writeBatch, serverTimestamp, Timestamp
} from './firebase.js';
import { TEST_MODE, GOOGLE_API_KEY, GOOGLE_CALENDAR_ID } from './config.js';
import { toDate } from './util.js';
import { session, myName } from './auth.js';

// ---------- seznam akcí ----------
export const events = { list: [], loaded: false, error: null };
const evListeners = new Set();
let evUnsub = null;

function fromDoc(d) {
  const x = d.data();
  const start = toDate(x.start) || new Date(0);
  let end = toDate(x.end) || start;
  if (end < start) end = start;
  return {
    id: d.id, title: x.title || '(bez názvu)', place: x.place || '', description: x.description || '',
    start, end, allDay: !!x.allDay, photoAlbum: x.photoAlbum || '', driveFiles: x.driveFiles || [],
    isTest: !!x.isTest, source: x.source || 'app', createdBy: x.createdBy || ''
  };
}

export function watchEvents(fn) {
  evListeners.add(fn);
  if (!evUnsub) {
    evUnsub = onSnapshot(query(collection(db, 'v2_akce'), orderBy('start', 'asc')), (snap) => {
      events.list = snap.docs.map(fromDoc);
      events.loaded = true;
      events.error = null;
      evListeners.forEach((f) => f(events));
    }, (err) => {
      console.error('Akce:', err);
      events.error = err;
      events.loaded = true;
      evListeners.forEach((f) => f(events));
    });
  } else if (events.loaded) {
    fn(events);
  }
  return () => evListeners.delete(fn);
}
export function stopEvents() { if (evUnsub) { evUnsub(); evUnsub = null; } events.list = []; events.loaded = false; }

export const findEvent = (id) => events.list.find((e) => e.id === id) || null;

// Nejbližší akce, která ještě neskončila.
export function nextEvent(now = new Date()) {
  return events.list.find((e) => e.end > now || e.start > now) || null;
}
export const isLive = (ev, now = new Date()) => ev.start <= now && now < ev.end;
export const isPast = (ev, now = new Date()) => ev.end <= now && !(ev.allDay && ev.start <= now && now < ev.end);

// ---------- kam se zapisují data k akci ----------
// Vrací cesty kolekcí pro docházku, komentáře a věci.
export function paths(ev) {
  if (ev.isTest) {
    return {
      attendees: ['v2_akce', ev.id, 'attendees'],
      declines: ['v2_akce', ev.id, 'declines'],
      comments: ['v2_akce', ev.id, 'comments'],
      items: ['v2_akce', ev.id, 'items']
    };
  }
  return {
    attendees: ['events', ev.id, 'attendees'],
    declines: ['events', ev.id, 'declines'],
    comments: ['events', ev.id, 'comments'],
    items: ['bringLists', ev.id, 'items']
  };
}
export const canWrite = (ev) => !!ev && (ev.isTest || !TEST_MODE);

// ---------- docházka ----------
const attendCache = new Map(); // id → { going: [], declined: [], at }
export function cachedAttendance(id) { return attendCache.get(id) || null; }

export async function loadAttendance(ev) {
  const p = paths(ev);
  const [a, d] = await Promise.all([
    getDocs(collection(db, ...p.attendees)).catch(() => null),
    getDocs(collection(db, ...p.declines)).catch(() => null)
  ]);
  const going = a ? a.docs.map((x) => x.id) : [];
  const declined = d ? d.docs.map((x) => x.id).filter((n) => !going.includes(n)) : [];
  const r = { going, declined, at: Date.now() };
  attendCache.set(ev.id, r);
  return r;
}

export function watchAttendance(ev, cb) {
  const p = paths(ev);
  let going = [], declined = [];
  const push = () => {
    const r = { going, declined: declined.filter((n) => !going.includes(n)), at: Date.now() };
    attendCache.set(ev.id, r);
    cb(r);
  };
  const u1 = onSnapshot(collection(db, ...p.attendees), (s) => { going = s.docs.map((x) => x.id); push(); }, () => {});
  const u2 = onSnapshot(collection(db, ...p.declines), (s) => { declined = s.docs.map((x) => x.id); push(); }, () => {});
  return () => { u1(); u2(); };
}

// target: 'attend' | 'decline'
export async function setAttendance(ev, target) {
  if (!canWrite(ev)) throw new Error('readonly');
  const me = myName();
  const p = paths(ev);
  const data = { user: me, at: new Date(), eventTitle: ev.title, eventStart: ev.start.toISOString(), via: 'v2' };
  const batch = writeBatch(db);
  const aRef = doc(db, ...p.attendees, me), dRef = doc(db, ...p.declines, me);
  if (target === 'attend') { batch.set(aRef, data); batch.delete(dRef); }
  else { batch.set(dRef, data); batch.delete(aRef); }
  await batch.commit();
}

// ---------- komentáře ----------
export function watchComments(ev, cb) {
  return onSnapshot(collection(db, ...paths(ev).comments), (s) => {
    const list = s.docs.map((d) => ({ id: d.id, ...d.data() }))
      .map((c) => ({ ...c, when: toDate(c.at) || new Date(0) }))
      .sort((a, b) => a.when - b.when);
    cb(list);
  }, (err) => { console.error('Komentáře:', err); cb([]); });
}
export async function addComment(ev, text) {
  if (!canWrite(ev)) throw new Error('readonly');
  await addDoc(collection(db, ...paths(ev).comments), { user: myName(), text: text.trim(), at: new Date().toISOString(), via: 'v2' });
}
export async function deleteComment(ev, id) {
  if (!canWrite(ev)) throw new Error('readonly');
  await deleteDoc(doc(db, ...paths(ev).comments, id));
}

// ---------- co přinést ----------
export function watchItems(ev, cb) {
  return onSnapshot(collection(db, ...paths(ev).items), (s) => {
    const list = s.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (toDate(a.at)?.getTime() || 0) - (toDate(b.at)?.getTime() || 0));
    cb(list);
  }, () => cb([]));
}
export async function addItem(ev, name) {
  if (!canWrite(ev)) throw new Error('readonly');
  await addDoc(collection(db, ...paths(ev).items), { name: name.trim(), takenBy: null, at: new Date() });
}
export async function toggleItem(ev, item) {
  if (!canWrite(ev)) throw new Error('readonly');
  const me = myName();
  if (item.takenBy && item.takenBy !== me) return;
  await updateDoc(doc(db, ...paths(ev).items, item.id), { takenBy: item.takenBy ? null : me });
}

// Album: přednost má odkaz u akce, pak záznam ve staré kolekci photoAlbums.
export async function loadAlbum(ev) {
  if (ev.photoAlbum) return ev.photoAlbum;
  try {
    const s = await getDoc(doc(db, 'photoAlbums', ev.id));
    return s.exists() ? (s.data().photoAlbum || '') : '';
  } catch (e) { return ''; }
}

// ---------- vlastní (testovací) akce ----------
export async function saveEvent(data, id = null) {
  const payload = {
    title: data.title.trim(), place: (data.place || '').trim(), description: (data.description || '').trim(),
    start: Timestamp.fromDate(data.start), end: Timestamp.fromDate(data.end), allDay: !!data.allDay,
    photoAlbum: (data.photoAlbum || '').trim(), updatedAt: serverTimestamp(), updatedBy: myName()
  };
  if (id) {
    await updateDoc(doc(db, 'v2_akce', id), payload);
    return id;
  }
  const ref = doc(collection(db, 'v2_akce'));
  await setDoc(ref, {
    ...payload, driveFiles: [], source: 'app', isTest: TEST_MODE,
    createdBy: myName(), createdByUid: session.user.uid, createdAt: serverTimestamp()
  });
  return ref.id;
}
export async function deleteEvent(ev) {
  // Podsbírky testovací akce se mažou zvlášť (Firestore je s dokumentem nesmaže).
  if (ev.isTest) {
    for (const sub of ['attendees', 'declines', 'comments', 'items']) {
      const s = await getDocs(collection(db, 'v2_akce', ev.id, sub)).catch(() => null);
      if (s) await Promise.all(s.docs.map((d) => deleteDoc(d.ref)));
    }
  }
  await deleteDoc(doc(db, 'v2_akce', ev.id));
}

// ---------- import z Google Kalendáře ----------
const PHOTO_RE = /photos\.google\.com|photos\.app\.goo\.gl/;
const PHOTO_ALBUMS = { '32. výročí': 'https://photos.app.goo.gl/CxEwjUJ2ULtoajTv8' };

export function convertCalendarItem(it) {
  const allDay = !it.start.dateTime;
  const start = new Date(it.start.dateTime || it.start.date + 'T00:00:00');
  let end = new Date((it.end && (it.end.dateTime || it.end.date)) ? (it.end.dateTime || it.end.date + 'T00:00:00') : start);
  if (isNaN(end.getTime()) || end < start) end = new Date(start);
  let photoAlbum = '';
  let driveFiles = [];
  if (it.attachments) {
    const p = it.attachments.find((a) => PHOTO_RE.test(a.fileUrl || ''));
    if (p) photoAlbum = p.fileUrl;
    driveFiles = it.attachments.filter((a) => a.fileUrl && !PHOTO_RE.test(a.fileUrl))
      .map((a) => ({ url: a.fileUrl, title: a.title || 'Soubor', mime: a.mimeType || '' }));
  }
  const description = (it.description || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ').trim();
  if (!photoAlbum) {
    const m = description.match(/https?:\/\/photos(?:\.app)?\.goo\.gl\/[^\s"'<>]+|https?:\/\/photos\.google\.com\/[^\s"'<>]+/);
    if (m) photoAlbum = m[0];
  }
  const title = (it.summary || '(bez názvu)').trim();
  if (!photoAlbum) {
    const k = Object.keys(PHOTO_ALBUMS).find((x) => x.trim().toLowerCase() === title.toLowerCase());
    if (k) photoAlbum = PHOTO_ALBUMS[k];
  }
  return { id: it.id, title, place: it.location || '', description, start, end, allDay, photoAlbum, driveFiles };
}

export async function fetchCalendar(onProgress = () => {}) {
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events`;
  const timeMax = new Date(); timeMax.setFullYear(timeMax.getFullYear() + 1);
  let pageToken = null, all = [];
  do {
    const u = new URL(base);
    u.search = new URLSearchParams({
      key: GOOGLE_API_KEY, singleEvents: 'true', orderBy: 'startTime', maxResults: '2500',
      timeMin: '2000-01-01T00:00:00Z', timeMax: timeMax.toISOString(),
      ...(pageToken ? { pageToken } : {})
    }).toString();
    const res = await fetch(u);
    if (!res.ok) {
      // Přesný důvod od Googlu (např. zablokovaná adresa nebo vypnuté API).
      let why = '';
      try { const j = await res.json(); why = j?.error?.message || ''; } catch (e) { /* bez textu */ }
      throw new Error(`Google Kalendář odpověděl ${res.status}${why ? ' — ' + why : ''}`);
    }
    const data = await res.json();
    all = all.concat((data.items || []).filter((it) => it.status !== 'cancelled' && it.start && (it.start.dateTime || it.start.date)));
    pageToken = data.nextPageToken || null;
    onProgress(`Staženo ${all.length} akcí…`);
  } while (pageToken);
  return all.map(convertCalendarItem).filter((e) => e.id && !isNaN(e.start.getTime()));
}

// Zapíše akce z kalendáře do v2_akce (přepíše jen kalendářová pole).
// Vrací { total, added, updated }.
export async function importCalendar(onProgress = () => {}) {
  const items = await fetchCalendar(onProgress);
  const existing = new Set(events.list.map((e) => e.id));
  let added = 0, updated = 0;
  for (let i = 0; i < items.length; i += 400) {
    const batch = writeBatch(db);
    for (const e of items.slice(i, i + 400)) {
      existing.has(e.id) ? updated++ : added++;
      batch.set(doc(db, 'v2_akce', e.id), {
        title: e.title, place: e.place, description: e.description,
        start: Timestamp.fromDate(e.start), end: Timestamp.fromDate(e.end), allDay: e.allDay,
        photoAlbum: e.photoAlbum, driveFiles: e.driveFiles,
        source: 'gcal', isTest: false, importedAt: serverTimestamp()
      }, { merge: true });
    }
    await batch.commit();
    onProgress(`Uloženo ${Math.min(i + 400, items.length)} z ${items.length}…`);
  }
  return { total: items.length, added, updated };
}

// ---------- export do kalendáře v telefonu (.ics) ----------
export function icsFor(ev) {
  const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const fd = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const escI = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (m) => '\\' + m);
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//KoKrSNeK//CS', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${ev.id}@kokrsnek`, `DTSTAMP:${f(new Date())}`,
    ev.allDay ? `DTSTART;VALUE=DATE:${fd(ev.start)}` : `DTSTART:${f(ev.start)}`,
    ev.allDay ? `DTEND;VALUE=DATE:${fd(ev.end > ev.start ? ev.end : new Date(ev.start.getTime() + 86400000))}` : `DTEND:${f(ev.end > ev.start ? ev.end : new Date(ev.start.getTime() + 3600000))}`,
    `SUMMARY:${escI(ev.title)}`, ev.place ? `LOCATION:${escI(ev.place)}` : '', ev.description ? `DESCRIPTION:${escI(ev.description)}` : '',
    'END:VEVENT', 'END:VCALENDAR'
  ].filter(Boolean);
  return lines.join('\r\n');
}
