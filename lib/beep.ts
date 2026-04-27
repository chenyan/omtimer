let sharedCtx: AudioContext | null = null;

const VOLUME_STORAGE_KEY = "omtimer-beep-volume-v1";
/** 音量为 1 时的线性峰值；正弦单音一般可安全到 ~0.6，再高易在部分设备上削顶 */
const BASE_PEAK = 0.55;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(1, Math.max(0, n));
}

/** 0～1，默认 1；持久化在 `localStorage` */
export function getBeepVolume(): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (raw == null) return 1;
    return clamp01(Number(raw));
  } catch {
    return 1;
  }
}

export function setBeepVolume(level: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VOLUME_STORAGE_KEY, String(clamp01(level)));
  } catch {
    // ignore quota
  }
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!C) return null;
  if (!sharedCtx) sharedCtx = new C();
  return sharedCtx;
}

/** 在首次「开始」等用户手势时调用，供 iOS/Safari 解锁 Web Audio。 */
export function unlockAudio(): void {
  const ctx = getContext();
  if (ctx && ctx.state === "suspended") {
    void ctx.resume();
  }
}

export function playStageCompleteBeep(): void {
  if (typeof window === "undefined") return;
  const v = getBeepVolume();
  if (v <= 0) return;
  try {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    const peak = BASE_PEAK * v;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.28);
  } catch {
    // ignore
  }
}
