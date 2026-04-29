import type { TimerPreset } from "./timer-types";

const STORAGE_KEY = "omtimer-presets-v1";

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultPresets(): TimerPreset[] {
  return [
    { id: "preset-478", name: "呼吸 4·7·8", desc: "放松呼吸练习, 吸气4秒,呼气7秒,吸气8秒", stagesSec: [4, 7, 8] },
    { id: "preset-pomodoro", name: "番茄工作", desc: "专注与休息循环", stagesSec: [25 * 60, 5 * 60] },
    { id: "preset-3s", name: "短时三段", desc: "快速热身计时", stagesSec: [30, 60, 90] },
    { id: "preset-55", name: "呼吸 5·5", desc: "放松呼吸练习,放松交感神经,鼻子吸气5秒, 嘴巴呼气5秒", stagesSec: [5, 5] },
  ];
}

export function parseStagesInput(raw: string): number[] | null {
  const parts = raw
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const nums: number[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
    nums.push(n);
  }
  return nums;
}

export function loadPresets(): TimerPreset[] {
  if (typeof window === "undefined") return defaultPresets();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPresets();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultPresets();
    const out: TimerPreset[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === "object" &&
        "id" in item &&
        "name" in item &&
        "stagesSec" in item &&
        typeof (item as TimerPreset).id === "string" &&
        typeof (item as TimerPreset).name === "string" &&
        Array.isArray((item as TimerPreset).stagesSec)
      ) {
        const stages = (item as TimerPreset).stagesSec.filter(
          (s): s is number =>
            typeof s === "number" && Number.isInteger(s) && s > 0
        );
        if (stages.length > 0) {
          out.push({
            id: (item as TimerPreset).id,
            name: String((item as TimerPreset).name).slice(0, 64),
            desc: typeof (item as { desc?: unknown }).desc === "string"
              ? (item as { desc: string }).desc.slice(0, 128)
              : "",
            stagesSec: stages,
          });
        }
      }
    }
    return out.length ? out : defaultPresets();
  } catch {
    return defaultPresets();
  }
}

export function savePresets(presets: TimerPreset[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // ignore quota / private mode
  }
}

/** 移除本地持久化的预设数据；下次 `loadPresets()` 将回落到 {@link defaultPresets} */
export function clearStoredPresets(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export { uid };
