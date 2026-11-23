// Nahrávání hlasovek jako WAV (16 kHz, mono) — přehraje se všude, i na iPhonu.
// Stejně jako stará aplikace (ta taky ukládala WAV kvůli kompatibilitě).
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const src = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const chunks = [];
  proc.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  src.connect(proc); proc.connect(ctx.destination);
  const started = Date.now();
  const stopAll = () => { try { proc.disconnect(); src.disconnect(); } catch (e) { /* nic */ } stream.getTracks().forEach((t) => t.stop()); ctx.close().catch(() => {}); };
  return {
    started,
    cancel: stopAll,
    stop() {
      stopAll();
      const seconds = Math.round((Date.now() - started) / 1000);
      return { blob: encodeWav(chunks, ctx.sampleRate, 16000), seconds };
    }
  };
}

function encodeWav(chunks, inRate, outRate) {
  const len = chunks.reduce((s, c) => s + c.length, 0);
  const data = new Float32Array(len);
  let o = 0; for (const c of chunks) { data.set(c, o); o += c.length; }
  const ratio = inRate / outRate;
  const n = Math.floor(len / ratio);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (p, t) => { for (let i = 0; i < t.length; i++) v.setUint8(p + i, t.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, outRate, true); v.setUint32(28, outRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const x = Math.max(-1, Math.min(1, data[Math.floor(i * ratio)] || 0));
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}
