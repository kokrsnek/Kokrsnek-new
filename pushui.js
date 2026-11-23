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
