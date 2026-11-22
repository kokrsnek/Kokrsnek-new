// Jdu / Nejdu — stejné chování jako ve staré aplikaci: první volba platí
// hned, změna už zadané odpovědi se potvrzuje (Ano / Ne / Zrušit).
import { setAttendance, canWrite } from './store.js';
import { confirmYesNo, toast } from './ui.js';
import { myName } from './auth.js';

export async function changeAttendance(ev, clicked, att) {
  if (!canWrite(ev)) { toast('Zkušební provoz: u akcí party se zatím jen čte.'); return false; }
  const me = myName();
  const going = att?.going.includes(me);
  const declined = att?.declined.includes(me);
  let target = clicked;
  if (going || declined) {
    const answer = await confirmYesNo(going ? 'Opravdu už nechceš jít?' : 'Opravdu chceš jít?');
    if (answer !== 'yes') return false;
    target = going ? 'decline' : 'attend';
  }
  try {
    await setAttendance(ev, target);
    toast(target === 'attend' ? 'Jdeš 👍' : 'Nejdeš — díky, že dáš vědět');
    return true;
  } catch (e) {
    console.error(e);
    toast('Nepovedlo se uložit. Zkus to znovu.');
    return false;
  }
}

export function attendButtons(ev, att) {
  const me = myName();
  const going = att?.going.includes(me), declined = att?.declined.includes(me);
  const ro = !canWrite(ev);
  return `<div class="two">
    <button class="btn ${going ? 'yes' : ''}" data-att="attend" ${ro ? 'aria-disabled="true"' : ''}>${going ? '✓ Jdu' : 'Jdu'}</button>
    <button class="btn ${declined ? 'no' : ''}" data-att="decline" ${ro ? 'aria-disabled="true"' : ''}>${declined ? '✕ Nejdu' : 'Nejdu'}</button>
  </div>${ro ? '<div class="note" style="margin-top:8px">Zkušební provoz — docházku zatím měň ve staré aplikaci.</div>' : ''}`;
}
