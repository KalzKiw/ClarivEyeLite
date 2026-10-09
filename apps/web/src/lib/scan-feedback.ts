/** Feedback de captura: beep (Web Audio) + vibración. Fallos silenciosos si no hay API. */

let audioCtx: AudioContext | null = null;

export function unlockScanAudio(): void {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") void audioCtx.resume();
  } catch {
    /* iOS / políticas autoplay */
  }
}

export function playScanBeep(): void {
  try {
    unlockScanAudio();
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(920, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.15);
  } catch {
    /* sin audio */
  }
}

/** Beep grave corto para “no match” / error. */
export function playScanErrorBeep(): void {
  try {
    unlockScanAudio();
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(220, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.08, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.2);
  } catch {
    /* sin audio */
  }
}

/** Vibración fuerte al marcar producto / captura OK. */
export function vibrateScanSuccess(): void {
  try {
    navigator.vibrate?.([80, 40, 80, 40, 120]);
  } catch {
    /* iOS u otros sin vibración */
  }
}

/** Vibración de error (código no en pedido / ya completo). */
export function vibrateScanError(): void {
  try {
    navigator.vibrate?.([30, 50, 30, 50, 30]);
  } catch {
    /* iOS u otros sin vibración */
  }
}
