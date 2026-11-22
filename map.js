// Výřez mapy se špendlíkem v detailu akce (OpenStreetMap přes Leaflet).
// Souřadnice: GPS v textu / známé místo party, jinak dohledání adresy
// (Nominatim) — výsledek se pamatuje v zařízení, ať se neptáme pořád dokola.
import { placeCoords, esc, icon } from './util.js';
import { MAPY_API_KEY } from './config.js';

let leaflet = null;
function loadLeaflet() {
  if (leaflet) return leaflet;
  leaflet = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    js.onload = () => resolve(window.L);
    js.onerror = () => { leaflet = null; reject(new Error('Mapu se nepodařilo načíst')); };
    document.head.appendChild(js);
  });
  return leaflet;
}

const CACHE_KEY = 'kokrsnek2Geo2';
function cacheGet(place) {
  try { return (JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'))[place] ?? undefined; } catch (e) { return undefined; }
}
function cacheSet(place, val) {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    c[place] = val;
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch (e) { /* nevadí */ }
}

async function geocode(place) {
  const known = placeCoords(place);
  if (known) return known;
  const cached = cacheGet(place);
  if (cached !== undefined) return cached;
  // Odkaz na mapu nebo dlouhý popis místo adresy nedohledáme.
  if (/https?:\/\//.test(place) || place.length > 120) return null;
  // Zkusí celou adresu, pak bez prvního údaje (název podniku), pak jen poslední dva.
  const parts = place.split(',').map((x) => x.trim()).filter(Boolean);
  const tries = [place];
  if (parts.length > 1) tries.push(parts.slice(1).join(', '));
  if (parts.length > 2) tries.push(parts.slice(-2).join(', '));
  try {
    for (const q of tries) {
      const u = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=cs&countrycodes=cz,sk,at,de,pl,hr,it&q=' + encodeURIComponent(q);
      const res = await fetch(u, { headers: { Accept: 'application/json' } });
      if (!res.ok) return null;
      const j = await res.json();
      if (j && j[0]) { const r = { lat: +j[0].lat, lng: +j[0].lon }; cacheSet(place, r); return r; }
    }
    cacheSet(place, null);
    return null;
  } catch (e) { return null; }
}

export async function showMap(box, place, href) {
  if (!box) return false;
  const c = await geocode(place);
  if (!c || !box.isConnected) return false;
  let L;
  try { L = await loadLeaflet(); } catch (e) { return false; }
  if (!box.isConnected) return false;
  // Název místa bez GPS a odkazů (ty jsou na mapě vidět i tak).
  const label = place.replace(/https?:\/\/\S+/g, '').replace(/-?\d{1,3}\.\d+\s*[NSns]?[,\s]+-?\d{1,3}\.\d+\s*[EWew]?/g, '').replace(/\s{2,}/g, ' ').replace(/^[\s,·-]+|[\s,·-]+$/g, '') || 'Místo akce';
  const mapy = !!MAPY_API_KEY;
  // Celá plocha mapy vede na navigaci; logo Mapy.com a copyright jsou samostatné odkazy (podmínka Mapy.com).
  box.innerHTML = `<div class="mapbox">
    <div class="map"></div>
    <a class="mapcover" href="${esc(href)}" target="_blank" rel="noopener" aria-label="${esc(label)} — otevřít v mapách"></a>
    <span class="mapname">${icon('pin', 15, 2.2)}<span>${esc(label)}</span></span>
    <a class="mapbtn" href="${esc(href)}" target="_blank" rel="noopener">Navigovat</a>
    ${mapy
      ? `<a class="mapylogo" href="https://mapy.com/" target="_blank" rel="noopener" aria-label="Mapy.com"><img src="https://api.mapy.com/img/api/logo.svg" alt="Mapy.com"></a>
         <a class="mapcopy" href="https://api.mapy.com/copyright" target="_blank" rel="noopener">© Seznam.cz a.s. a další</a>`
      : '<span class="mapcopy">© OpenStreetMap</span>'}
  </div>`;
  const el = box.querySelector('.map');
  const map = L.map(el, {
    center: [c.lat, c.lng], zoom: 14, zoomControl: false, attributionControl: false,
    dragging: false, touchZoom: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, tap: false
  });
  if (mapy) {
    // Turistická mapa Mapy.com (retina dlaždice na displejích s vyšším rozlišením).
    const size = window.devicePixelRatio > 1 ? '256@2x' : '256';
    L.tileLayer(`https://api.mapy.com/v1/maptiles/outdoor/${size}/{z}/{x}/{y}?apikey=${encodeURIComponent(MAPY_API_KEY)}`, { maxZoom: 19, minZoom: 0, tileSize: 256 }).addTo(map);
  } else {
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);
  }
  L.marker([c.lat, c.lng], {
    icon: L.divIcon({ className: 'mappin', html: '<svg width="34" height="44" viewBox="0 0 34 44"><path d="M17 43s15-14.6 15-26A15 15 0 0 0 2 17c0 11.4 15 26 15 26z" fill="#E2664F" stroke="#fff" stroke-width="2.5"/><circle cx="17" cy="17" r="5.5" fill="#fff"/></svg>', iconSize: [34, 44], iconAnchor: [17, 43] })
  }).addTo(map);
  setTimeout(() => map.invalidateSize(), 60);
  return true;
}

// Předem stáhne souřadnice, knihovnu mapy a dlaždice kolem místa,
// aby se mapa u sousední akce po swipu ukázala hned.
export async function prefetchMap(place) {
  if (!place) return;
  const c = await geocode(place);
  if (!c) return;
  loadLeaflet().catch(() => {});
  const z = 14;
  const n = 2 ** z;
  const xt = Math.floor((c.lng + 180) / 360 * n);
  const lr = c.lat * Math.PI / 180;
  const yt = Math.floor((1 - Math.log(Math.tan(lr) + 1 / Math.cos(lr)) / Math.PI) / 2 * n);
  const size = window.devicePixelRatio > 1 ? '256@2x' : '256';
  for (let dx = -2; dx <= 2; dx++) for (let dy = -1; dy <= 1; dy++) {
    const img = new Image();
    img.src = MAPY_API_KEY
      ? `https://api.mapy.com/v1/maptiles/outdoor/${size}/${z}/${xt + dx}/${yt + dy}?apikey=${encodeURIComponent(MAPY_API_KEY)}`
      : `https://${'abc'[(xt + dx + yt + dy + 30) % 3]}.tile.openstreetmap.org/${z}/${xt + dx}/${yt + dy}.png`;
  }
}
