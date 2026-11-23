// Narozeniny a svátky členů party: jednou denně po otevření aplikace dialog
// s konfetami (oslavenci osobní přání, ostatním připomínka „Nezapomeň popřát“).
import { PARTY_PEOPLE } from './people.js';
import { namedayFor } from './namedays.js';
import { myName } from './auth.js';
import { esc } from './util.js';

const KEY = 'kokrsnek2CelebrateDate';
const loose = (n) => String(n || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function checkCelebrations(force = false) {
  const today = new Date();
  const ds = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  try { if (!force && localStorage.getItem(KEY) === ds) return; } catch (e) { /* nic */ }
  const d = today.getDate(), m = today.getMonth() + 1;
  const bdays = PARTY_PEOPLE.filter((p) => p.day === d && p.month === m);
  const nd = namedayFor(today);
  const ndNames = nd ? nd.split(/\s+a\s+|,\s*/).map((s) => s.trim()).filter(Boolean) : [];
  const ndPeople = PARTY_PEOPLE.filter((p) => ndNames.includes(p.name));
  if (!bdays.length && !ndPeople.length) return;
  try { localStorage.setItem(KEY, ds); } catch (e) { /* nic */ }
  const me = loose(myName());
  const isMe = (p) => !!(me && p.app && loose(p.app) === me);
  const queue = [];
  const myB = bdays.some(isMe), myN = ndPeople.some(isMe);
  if (myB || myN) queue.push({ title: myB && myN ? '🎉 Vše nejlepší k dnešním narozeninám i svátku!' : myB ? '🎂 Vše nejlepší k dnešním narozeninám!' : '🎉 Vše nejlepší k dnešnímu svátku!', text: 'Přeje ti celá parta KoKrŠNeK 🥳' });
  bdays.filter((p) => !isMe(p)).forEach((p) => queue.push({ title: '🎂 Narozeniny!', text: `Nezapomeň dnes popřát ${p.nick}` }));
  const other = ndPeople.filter((p) => !isMe(p));
  if (other.length) queue.push({ title: `🎉 Svátek ${ndNames.length > 1 ? 'mají' : 'má'} ${nd}!`, text: other.length === 1 ? `Nezapomeň dnes popřát ${other[0].nick}` : `Nezapomeň dnes popřát: ${other.map((p) => p.nick).join(', ')}` });
  // Až po úvodní animaci.
  setTimeout(() => showQueue(queue), document.querySelector('.intro') ? 6200 : 600);
}

function showQueue(q) {
  if (!q.length) return;
  const it = q.shift();
  confetti();
  const bd = document.createElement('div');
  bd.className = 'backdrop';
  bd.style.alignItems = 'center';
  bd.innerHTML = `<div class="sheet celebrate" role="dialog" aria-modal="true" style="border-radius:24px;margin:16px;text-align:center">
    <div style="font-size:48px;line-height:1">${it.title.match(/^\S+/)[0]}</div>
    <h3 style="margin:10px 0 6px">${esc(it.title.replace(/^\S+\s*/, ''))}</h3><p style="font-size:16px">${esc(it.text)}</p>
    <button class="btn primary big block" style="margin-top:10px">OK</button></div>`;
  const close = () => { bd.remove(); showQueue(q); };
  bd.addEventListener('click', (e) => { if (e.target === bd || e.target.closest('button')) close(); });
  document.body.appendChild(bd);
}

export function confetti() {
  const colors = ['#3E8F68', '#e5c07b', '#e06c75', '#61afef', '#c678dd', '#ffffff'];
  const box = document.createElement('div');
  box.className = 'confetti';
  for (let i = 0; i < 80; i++) {
    const p = document.createElement('i');
    const s = 6 + Math.random() * 6;
    p.style.cssText = `left:${Math.random() * 100}%;width:${s}px;height:${s * 0.4}px;background:${colors[i % colors.length]};transform:rotate(${Math.random() * 360}deg);animation-duration:${5 + Math.random() * 3}s;animation-delay:${Math.random()}s`;
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 9500);
}
