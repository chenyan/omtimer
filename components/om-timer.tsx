"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useOmTimer } from "@/hooks/use-om-timer";
import { parseStagesInput } from "@/lib/preset-storage";
import { getBeepVolume, setBeepVolume } from "@/lib/beep";
import { pieSectorPath } from "@/lib/sector-path";

const SECTOR_COUNT = 8;

function sectorVar(index: number): string {
  return `var(--om-sector-${index % SECTOR_COUNT})`;
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

export function OmTimer() {
  const t = useOmTimer();
  const { h, m, s, ms } = t.formatHMS();
  const timeStr = useMemo(() => {
    if (h > 0) {
      return `${h}:${pad2(m)}:${pad2(s)}`;
    }
    return `${pad2(m)}:${pad2(s)}`;
  }, [h, m, s]);
  const ms3 = useMemo(() => (ms / 10).toFixed(0).padStart(2, "0"), [ms]);

  const p = t.activePreset;
  const [nameDraft, setNameDraft] = useState(p?.name ?? "");
  const [stagesDraft, setStagesDraft] = useState(() => p?.stagesSec.join(" / ") ?? "");
  const [beepVolume01, setBeepVolume01] = useState(1);

  useEffect(() => {
    setBeepVolume01(getBeepVolume());
  }, []);
  const stageFull = t.currentStageSec > 0 ? t.currentStageSec : 1;
  const progress =
    t.status === "running" || t.status === "paused"
      ? 1 - Math.min(1, Math.max(0, t.displayRemainSec) / stageFull)
      : 0;

  const stagesKey = p?.stagesSec.join("-") ?? "";
  useEffect(() => {
    if (p) {
      setNameDraft(p.name);
      setStagesDraft(p.stagesSec.join(" / "));
    }
  }, [p?.id, p?.name, stagesKey]);

  const onCommitStages = () => {
    if (!p || t.status === "running" || t.status === "paused") return;
    const parsed = parseStagesInput(stagesDraft.replaceAll("/", " "));
    if (parsed) {
      t.updateActivePreset((cur) => ({ ...cur, stagesSec: parsed }));
    } else {
      setStagesDraft(p.stagesSec.join(" / "));
    }
  };

  const onCommitName = () => {
    if (!p) return;
    t.updateActivePreset((cur) => ({ ...cur, name: nameDraft.trim() || cur.name }));
  };

  const diskR = 46;
  const cx = 50;
  const cy = 50;
  const sectorPath = useMemo(
    () => pieSectorPath(cx, cy, diskR, progress),
    [progress]
  );
  const sectorFill = sectorVar(t.stageIndex);

  return (
    <div className="om-root relative min-h-svh w-full overflow-hidden text-[var(--om-fg)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,var(--om-glow),transparent_55%),var(--om-bg)]"
      />
      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:px-8 sm:py-12">
        <header className="space-y-1 text-center sm:text-left">
          <h1 className="font-sans text-2xl font-semibold tracking-tight sm:text-3xl">
            <span className="text-black [text-shadow:1px_1px_0_#fff] dark:text-[var(--om-fg)] dark:[text-shadow:1px_1px_0_rgba(0,0,0,0.45)]">
              OMTimer
            </span>
          </h1>
          <p className="text-sm text-[var(--om-muted)]">多阶段/循环计时器</p>
        </header>

        {/* 预设选择 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="w-full min-w-0 sm:max-w-md">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--om-muted)]">
              计时预设
            </label>
            <div className="flex flex-wrap gap-2">
              {t.presets.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => t.setActivePresetId(x.id)}
                  className={`rounded-full px-3 py-1.5 text-sm transition-all duration-200 ${t.activePresetId === x.id
                    ? "bg-[var(--om-surface-active)] text-[var(--om-fg)] ring-1 ring-[var(--om-a)]/40 shadow-[0_0_0_1px_rgba(0,0,0,0.04)]"
                    : "bg-[var(--om-surface)] text-[var(--om-muted)] ring-1 ring-[var(--om-line)] hover:text-[var(--om-fg)]"
                    }`}
                >
                  {x.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => t.addPreset()}
                className="rounded-full border border-dashed border-[var(--om-line)] px-3 py-1.5 text-sm text-[var(--om-muted)] transition-colors hover:border-[var(--om-a)] hover:text-[var(--om-a)]"
              >
                ＋ 新预设
              </button>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {t.presets.length > 1 && (
              <button
                type="button"
                disabled={t.status === "running" || t.status === "paused"}
                onClick={() => t.removeActivePreset()}
                className="rounded-lg border border-[color-mix(in_oklab,var(--om-line)_80%,transparent)] bg-[var(--om-surface)] px-3 py-1.5 text-xs font-medium text-[var(--om-fg)] shadow-sm transition-[border-color,background-color,color,transform] hover:border-red-400/50 hover:bg-[color-mix(in_oklab,red_6%,var(--om-surface))] hover:text-red-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 dark:hover:border-red-500/35 dark:hover:bg-red-950/35 dark:hover:text-red-300"
              >
                删除当前预设
              </button>
            )}
            <button
              type="button"
              disabled={t.status === "running" || t.status === "paused"}
              onClick={() => {
                if (
                  !window.confirm(
                    "将恢复为内置的三组预设，并清除本地保存的自定义预设与修改。当前计时也会复位。确定吗？"
                  )
                ) {
                  return;
                }
                t.restoreSystemPresets();
              }}
              className="rounded-lg border border-[color-mix(in_oklab,var(--om-line)_80%,transparent)] bg-[var(--om-surface)] px-3 py-1.5 text-xs font-medium text-[var(--om-muted)] shadow-sm transition-[border-color,background-color,color,transform] hover:border-[var(--om-a)]/45 hover:bg-[color-mix(in_oklab,var(--om-a)_8%,var(--om-surface))] hover:text-[var(--om-a)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
            >
              恢复系统预设
            </button>
          </div>
        </div>

        {/* 阶段条 */}
        {p && p.stagesSec.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--om-muted)]">阶段</p>
            <div className="flex flex-wrap gap-2">
              {p.stagesSec.map((sec, i) => {
                const isPast = t.status === "running" && i < t.stageIndex;
                const isNow =
                  (t.status === "running" || t.status === "paused" || t.status === "idle" || t.status === "done") &&
                  i === t.stageIndex;
                const stageHue = sectorVar(i);
                return (
                  <div
                    key={i}
                    style={
                      isNow
                        ? ({
                          boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${stageHue}, transparent 46%)`,
                        } satisfies CSSProperties)
                        : undefined
                    }
                    className={`relative overflow-hidden rounded-lg px-3 py-1.5 text-sm tabular-nums transition-all duration-300 ${isNow
                      ? "bg-[var(--om-surface-active)] text-[var(--om-fg)]"
                      : isPast
                        ? "bg-[var(--om-surface)]/60 text-[var(--om-muted)] line-through opacity-70"
                        : "bg-[var(--om-surface)] text-[var(--om-muted)] ring-1 ring-[var(--om-line)]"
                      } ${isNow ? "scale-[1.02]" : ""} `}
                  >
                    {isNow && (
                      <span
                        className="absolute inset-0 -z-10 animate-pulse opacity-90"
                        style={{ backgroundColor: `color-mix(in oklab, ${stageHue}, transparent 86%)` }}
                        aria-hidden
                      />
                    )}
                    第 {i + 1} 段 · {sec}s
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 主表盘 */}
        <div className="flex flex-col items-center justify-center gap-6">
          <div
            className="relative flex aspect-square w-[min(88vw,20rem)] items-center justify-center sm:w-80"
            data-status={t.status}
          >
            <svg
              className="absolute h-full w-full"
              viewBox="0 0 100 100"
              role="img"
              aria-label="阶段进度"
            >
              <title>阶段进度：扇形从 12 点顺时针铺满整圆</title>
              {/* 浅色底盘 */}
              <circle
                cx={cx}
                cy={cy}
                r={diskR}
                fill="var(--om-disk-plate)"
                className="transition-opacity duration-300"
              />
              {sectorPath === "full" ? (
                <circle cx={cx} cy={cy} r={diskR} fill={sectorFill} className="transition-colors duration-150" />
              ) : sectorPath ? (
                <path
                  d={sectorPath}
                  fill={sectorFill}
                  className="transition-colors duration-150 ease-linear"
                />
              ) : null}
              {/* 外缘参考圆（非环形进度，仅边界） */}
              <circle
                cx={cx}
                cy={cy}
                r={diskR}
                fill="none"
                stroke="var(--om-line)"
                strokeWidth="0.9"
                opacity={0.45}
              />
            </svg>
            <div className="z-10 flex min-w-0 max-w-full flex-col items-center text-center">
              {/* 固定行宽 + 分栏，避免等宽数字/冒号切换时整体左右晃动；保留副标题行高度，避免状态文案出现时机芯上下跳 */}
              <div
                className="flex w-full max-w-[min(100%,14rem)] select-none items-baseline justify-center gap-0 font-mono text-5xl font-light tabular-nums tracking-tight [font-feature-settings:'tnum'_1] whitespace-nowrap sm:text-6xl"
                style={{ lineHeight: 1 }}
              >
                <span
                  className={`w-[9ch] shrink-0 text-center ${t.status === "done" ? "text-[var(--om-b)]" : "text-[var(--om-fg)]"
                    }`}
                >
                  {timeStr}
                </span>
                <span className="w-[2.5ch] shrink-0 pl-0.5 text-left text-2xl font-extralight text-[var(--om-muted)] sm:pl-1 sm:text-3xl">
                  .{ms3}
                </span>
              </div>
              <div className="mt-1 flex min-h-[1.25rem] items-center justify-center text-sm" aria-live="polite">
                {t.status === "done" && <span className="text-[var(--om-b)]">本轮完成</span>}
                {t.status === "paused" && <span className="text-[var(--om-muted)]">已暂停</span>}
              </div>
            </div>
          </div>

          <div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-center sm:gap-x-6">
            <label className="flex min-w-0 cursor-pointer select-none items-center gap-2 text-sm text-[var(--om-muted)]">
              <input
                type="checkbox"
                checked={t.loop}
                onChange={(e) => t.setLoop(e.target.checked)}
                className="size-4 shrink-0 rounded border-[var(--om-line)] text-[var(--om-a)] focus:ring-[var(--om-a)]/40"
              />
              <span className="min-w-0 leading-snug">循环计时</span>
            </label>

            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3 text-sm text-[var(--om-muted)]">
                <span id="om-beep-volume-label">音量</span>
                <span className="tabular-nums text-[var(--om-fg)]">{Math.round(beepVolume01 * 100)}%</span>
              </div>
              <input
                id="om-beep-volume"
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(beepVolume01 * 100)}
                onChange={(e) => {
                  const next = Number(e.target.value) / 100;
                  setBeepVolume01(next);
                  setBeepVolume(next);
                }}
                aria-labelledby="om-beep-volume-label"
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--om-line)]/60 accent-[var(--om-a)] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--om-a)] [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--om-a)]"
              />
            </div>
          </div>
        </div>

        <div className="flex w-full max-w-lg flex-col gap-2.5 self-center sm:flex-row sm:items-stretch sm:justify-center sm:gap-3">
          {t.status === "running" ? (
            <button
              type="button"
              onClick={() => t.pause()}
              className="relative min-h-[3.25rem] flex-1 overflow-hidden rounded-xl border border-[color-mix(in_oklab,var(--om-line)_75%,transparent)] bg-[var(--om-surface)] px-6 py-3.5 text-sm font-semibold tracking-wide text-[var(--om-fg)] shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset] transition-[border-color,box-shadow,transform] duration-200 hover:border-[color-mix(in_oklab,var(--om-a)_35%,var(--om-line))] hover:shadow-[0_8px_24px_-12px_rgba(13,148,136,0.25)] active:scale-[0.98] dark:shadow-none dark:hover:shadow-[0_8px_28px_-14px_rgba(45,212,191,0.12)]"
            >
              暂停
            </button>
          ) : (
            <button
              type="button"
              onClick={() => t.startOrResume()}
              className="relative min-h-[3.25rem] flex-1 overflow-hidden rounded-xl bg-[var(--om-a)] px-6 py-3.5 text-sm font-semibold tracking-wide text-white shadow-[0_4px_18px_-6px_rgba(13,148,136,0.55),0_1px_0_0_rgba(255,255,255,0.15)_inset] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[color-mix(in_oklab,var(--om-a)_88%,black)] hover:shadow-[0_6px_22px_-6px_rgba(13,148,136,0.45)] active:scale-[0.98] dark:shadow-[0_4px_24px_-8px_rgba(45,212,191,0.35),0_1px_0_0_rgba(255,255,255,0.08)_inset] dark:hover:bg-[color-mix(in_oklab,var(--om-a)_85%,white)] dark:hover:shadow-[0_8px_28px_-10px_rgba(45,212,191,0.28)]"
            >
              {t.status === "paused" ? "继续" : t.status === "done" ? "再跑一轮" : "开始"}
            </button>
          )}
          <button
            type="button"
            onClick={() => t.reset()}
            className="min-h-[3.25rem] flex-1 rounded-xl border border-[color-mix(in_oklab,var(--om-line)_90%,transparent)] bg-[color-mix(in_oklab,var(--om-bg)_40%,transparent)] px-6 py-3.5 text-sm font-medium tracking-wide text-[var(--om-muted)] backdrop-blur-[2px] transition-[border-color,background-color,color,transform] duration-200 hover:border-[var(--om-line)] hover:bg-[var(--om-surface)] hover:text-[var(--om-fg)] active:scale-[0.98]"
          >
            重置
          </button>
        </div>

        {/* 编辑 */}
        {p && (
          <section className="rounded-2xl bg-[var(--om-surface)]/80 p-4 ring-1 ring-[var(--om-line)] backdrop-blur-sm sm:p-5">
            <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--om-muted)]">编辑当前预设</h2>
            <p className="mt-1 text-xs text-[var(--om-muted)]/80">仅保存在本机浏览器，换设备不会同步</p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <label className="mb-1 block text-sm text-[var(--om-fg)]">名称</label>
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={onCommitName}
                  disabled={t.status === "running" || t.status === "paused"}
                  className="w-full rounded-xl border border-[var(--om-line)] bg-[var(--om-bg)] px-3 py-2 text-sm outline-none ring-0 transition focus:border-[var(--om-a)] disabled:opacity-50"
                />
              </div>
              <div className="sm:w-1/2">
                <label className="mb-1 block text-sm text-[var(--om-fg)]">各段秒数</label>
                <input
                  value={stagesDraft}
                  onChange={(e) => setStagesDraft(e.target.value)}
                  onBlur={onCommitStages}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  disabled={t.status === "running" || t.status === "paused"}
                  placeholder="例如 4 7 8 或 25, 5"
                  className="w-full rounded-xl border border-[var(--om-line)] bg-[var(--om-bg)] px-3 py-2 font-mono text-sm outline-none transition focus:border-[var(--om-a)] disabled:opacity-50"
                />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
