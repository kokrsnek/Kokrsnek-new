// Zvoneček a přepínač notifikací (Akce → zvoneček, Parta → Notifikace).
import { enablePush, disablePush, isPushOn } from './push.js';
import { toast, choose } from './ui.js';
export { isPushOn };

export async function pushToggle(btn) {
  if (isPushOn()) {
    const v = await choose({ title: 'Notifikace', text: 'V tomhle telefonu jsou notifikace zapnuté.', buttons: [
      { label: 'Vypnout v tomhle telefonu', value: 'off', kind: 'no' }, { label: 'Nechat zapnuté', value: null }] });
    if (v !== 'off') return false;
    await disablePush();
    if (btn) btn.classList.remove('on');
    toast('Notifikace vypnuté');
    return false;
  }
  try {
    toast('Zapínám notifikace…');
    await enablePush();
    if (btn) btn.classList.add('on');
    toast('Notifikace zapnuté 🔔');
    return true;
  } catch (e) {
    const m = e && e.message;
    if (m === 'ios-home') await choose({ title: 'Nejdřív na plochu', text: 'Na iPhonu chodí notifikace jen aplikaci přidané na plochu: v Safari Sdílet → Přidat na plochu, a pak ji otevři z plochy.', buttons: [{ label: 'Rozumím', value: 1 }] });
    else if (m === 'denied') await choose({ title: 'Notifikace jsou zakázané', text: 'Povol je v Nastavení telefonu → Notifikace → KoKrŠNeK a zkus to znovu.', buttons: [{ label: 'Rozumím', value: 1 }] });
    else { console.error(e); toast('Notifikace se nepodařilo zapnout.'); }
    return false;
  }
}

// Po instalaci (první spuštění z plochy): upozornění zapnout samo, nebo
// jedním klepnutím — iPhone i Android chtějí povolení potvrdit prstem.
const ASKED = 'kokrsnek2PushAsked';
export async function askPushOnInstall() {
  const installed = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  if (!installed || isPushOn() || !('Notification' in window)) return;
  let asked = null;
  try { asked = localStorage.getItem(ASKED); } catch (e) { /* nic */ }
  if (asked || Notification.permission === 'denied') return;
  if (Notification.permission === 'granted') {
    try { localStorage.setItem(ASKED, '1'); } catch (e) { /* nic */ }
    try { await enablePush(); } catch (e) { /* zkusí se v Partě */ }
    return;
  }
  // Až doběhne úvodní animace a je vidět obrazovka Akce (bez otevřeného okna).
  await new Promise((res) => {
    const ok = () => !document.querySelector('.intro') && !document.querySelector('.backdrop')
      && /^#?\/?(akce)?$/.test(location.hash) && !document.hidden;
    let calm = 0;
    const t = setInterval(() => { calm = ok() ? calm + 1 : 0; if (calm >= 3) { clearInterval(t); res(); } }, 400);
  });
  try { localStorage.setItem(ASKED, '1'); } catch (e) { /* nic */ }
  const v = await choose({ title: '🔔 Zapnout upozornění?', text: 'Dáme ti vědět o nových akcích, zprávách v chatu, hrách a fotkách. Vypnout to jde kdykoli v Partě (ozubené kolo).', buttons: [
    { label: 'Zapnout upozornění', value: 'on', kind: 'primary' }, { label: 'Teď ne', value: null }] });
  if (v === 'on') await pushToggle();
}
