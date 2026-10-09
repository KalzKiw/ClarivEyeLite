/** Feedback de captura exitosa: beep (Web Audio) + vibración. Fallos silenciosos. */

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
    gain.gain.exponentialRampToValueAtTime(0.09, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.11);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.12);
  } catch {
    /* sin audio */
  }
}

export function vibrateScanSuccess(): void {
  try {
    navigator.vibrate?.([40, 30, 40]);
  } catch {
    /* iOS u otros sin vibración */
  }
}
