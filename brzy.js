// Zatím prázdné záložky Kde jsi? a Chat.
import { icon } from './util.js';
import { tabbar } from './ui.js';

const INFO = {
  kde: { title: 'Kde jsi?', ic: 'pin', text: 'Check-iny s mapou, místy a komentáři přijdou ve 3. fázi. Do té doby je najdeš ve staré aplikaci.' },
  chat: { title: 'Chat', ic: 'chat', text: 'Chat party a soukromé zprávy přijdou ve 4. fázi. Do té doby piš ve staré aplikaci.' }
};

export function render(root, { tab }) {
  const i = INFO[tab];
  root.innerHTML = `<div class="screen">
    <div class="top"><div class="h1">${i.title}</div></div>
    <div class="center" style="padding-bottom:120px">
      <div class="ibtn" style="width:72px;height:72px;border-radius:22px;color:var(--accent-text)">${icon(i.ic, 34, 1.8)}</div>
      <div style="font-weight:700;font-size:18px">Připravujeme</div>
      <p class="sub" style="font-size:14px;line-height:1.5;max-width:300px;margin:0">${i.text}</p>
    </div>
    ${tabbar(tab)}
  </div>`;
}
