let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function beep(ctx: AudioContext, freq: number, startTime: number, duration: number, gainValue = 0.15) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.01);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

export function playJoinSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    beep(ctx, 523.25, now, 0.12); // C5
    beep(ctx, 783.99, now + 0.1, 0.15); // G5 (subindo)
  } catch {
    // Web Audio pode falhar em navegadores sem suporte — não é crítico.
  }
}

export function playLeaveSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    beep(ctx, 783.99, now, 0.12); // G5
    beep(ctx, 523.25, now + 0.1, 0.15); // C5 (descendo)
  } catch {
    // idem
  }
}
