// Výřez mapy se špendlíkem v detailu akce (OpenStreetMap přes Leaflet).
// Souřadnice: GPS v textu / známé místo party, jinak dohledání adresy
// (Nominatim) — výsledek se pamatuje v zařízení, ať se neptáme pořád dokola.
import { placeCoords, esc } from './util.js';

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

const CACHE_KEY = 'kokrsnek2Geo';
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
  try {
    const u = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=cs&countrycodes=cz,sk,at,de,pl,hr,it&q=' + encodeURIComponent(place);
    const res = await fetch(u, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const j = await res.json();
    const r = j && j[0] ? { lat: +j[0].lat, lng: +j[0].lon } : null;
    cacheSet(place, r);
    return r;
  } catch (e) { return null; }
}

export async function showMap(box, place, href) {
  if (!box) return;
  const c = await geocode(place);
  if (!c || !box.isConnected) return;
  let L;
  try { L = await loadLeaflet(); } catch (e) { return; }
  if (!box.isConnected) return;
  box.innerHTML = `<a class="mapbox" href="${esc(href)}" target="_blank" rel="noopener" aria-label="Otevřít místo v mapách"><div class="map"></div><span class="mapbtn">Navigovat</span></a>`;
  const el = box.querySelector('.map');
  const map = L.map(el, {
    center: [c.lat, c.lng], zoom: 14, zoomControl: false, attributionControl: true,
    dragging: false, touchZoom: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, tap: false
  });
  map.attributionControl.setPrefix('');
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
  L.marker([c.lat, c.lng], {
    icon: L.divIcon({ className: 'mappin', html: '<svg width="34" height="44" viewBox="0 0 34 44"><path d="M17 43s15-14.6 15-26A15 15 0 0 0 2 17c0 11.4 15 26 15 26z" fill="#E2664F" stroke="#fff" stroke-width="2.5"/><circle cx="17" cy="17" r="5.5" fill="#fff"/></svg>', iconSize: [34, 44], iconAnchor: [17, 43] })
  }).addTo(map);
  setTimeout(() => map.invalidateSize(), 60);
}
