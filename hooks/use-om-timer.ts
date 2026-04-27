"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playStageCompleteBeep, unlockAudio } from "@/lib/beep";
import {
  clearStoredPresets,
  defaultPresets,
  loadPresets,
  savePresets,
  uid,
} from "@/lib/preset-storage";
import type { TimerPreset, TimerRunStatus } from "@/lib/timer-types";

function formatHMS(totalSec: number): { h: number; m: number; s: number; ms: number } {
  const ms = Math.max(0, Math.floor(totalSec * 1000));
  const t = Math.floor(totalSec);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return { h, m, s, ms: ms % 1000 };
}

const initial = defaultPresets();

export function useOmTimer() {
  const [presets, setPresets] = useState<TimerPreset[]>(initial);
  const [activePresetId, setActivePresetId] = useState<string>(initial[0]!.id);
  const [loop, setLoop] = useState(false);
  const [status, setStatus] = useState<TimerRunStatus>("idle");
  const [stageIndex, setStageIndex] = useState(0);
  const [displayRemainSec, setDisplayRemainSec] = useState(
    () => initial[0]?.stagesSec[0] ?? 0
  );
  const deadlineRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const statusRef = useRef<TimerRunStatus>("idle");
  const stageIndexRef = useRef(0);
  const activePresetRef = useRef<TimerPreset | null>(initial[0] ?? null);
  const loopRef = useRef(false);

  const activePreset = useMemo(
    () => presets.find((p) => p.id === activePresetId) ?? presets[0] ?? null,
    [presets, activePresetId]
  );

  useEffect(() => {
    if (activePreset) activePresetRef.current = activePreset;
  }, [activePreset]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    stageIndexRef.current = stageIndex;
  }, [stageIndex]);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  useEffect(() => {
    const loaded = loadPresets();
    setPresets(loaded);
    setActivePresetId((cur) => (loaded.some((p) => p.id === cur) ? cur : loaded[0]!.id));
  }, []);

  useEffect(() => {
    savePresets(presets);
  }, [presets]);

  const currentStageSec = activePreset?.stagesSec[stageIndex] ?? 0;
  const totalStages = activePreset?.stagesSec.length ?? 0;

  const syncDisplayForIdle = useCallback(() => {
    const p = activePresetRef.current;
    if (!p || p.stagesSec.length === 0) {
      setDisplayRemainSec(0);
      return;
    }
    const idx = Math.min(stageIndexRef.current, p.stagesSec.length - 1);
    setDisplayRemainSec(p.stagesSec[idx]);
  }, []);

  const stopRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const onStageComplete = useCallback(() => {
    const p = activePresetRef.current;
    if (!p) return;
    const idx = stageIndexRef.current;
    const next = idx + 1;
    const shouldLoop = loopRef.current;
    playStageCompleteBeep();

    if (next < p.stagesSec.length) {
      setStageIndex(next);
      stageIndexRef.current = next;
      const nextSec = p.stagesSec[next];
      deadlineRef.current = performance.now() + nextSec * 1000;
    } else if (shouldLoop) {
      setStageIndex(0);
      stageIndexRef.current = 0;
      const first = p.stagesSec[0] * 1000;
      deadlineRef.current = performance.now() + first;
    } else {
      statusRef.current = "done";
      setStatus("done");
      setStageIndex(0);
      stageIndexRef.current = 0;
      deadlineRef.current = null;
      setDisplayRemainSec(p.stagesSec[0] ?? 0);
    }
  }, []);

  const tick = useCallback(() => {
    if (statusRef.current !== "running" || deadlineRef.current == null) {
      return;
    }
    const d = deadlineRef.current;
    const rem = (d - performance.now()) / 1000;
    if (rem <= 0) {
      onStageComplete();
    } else {
      setDisplayRemainSec(rem);
    }
    if (statusRef.current === "running" && deadlineRef.current != null) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [onStageComplete]);

  const startRaf = useCallback(() => {
    stopRaf();
    rafRef.current = requestAnimationFrame(tick);
  }, [stopRaf, tick]);

  useEffect(() => {
    return () => stopRaf();
  }, [stopRaf]);

  const startOrResume = useCallback(() => {
    unlockAudio();
    const p = activePreset;
    if (!p || p.stagesSec.length === 0) return;
    if (status === "running") return;

    if (status === "paused") {
      const addMs = displayRemainSec * 1000;
      deadlineRef.current = performance.now() + addMs;
      statusRef.current = "running";
      setStatus("running");
      startRaf();
      return;
    }

    statusRef.current = "running";
    setStatus("running");
    const idx = status === "done" ? 0 : stageIndex;
    const safeIdx = Math.min(idx, p.stagesSec.length - 1);
    setStageIndex(safeIdx);
    stageIndexRef.current = safeIdx;
    const sec = p.stagesSec[safeIdx];
    deadlineRef.current = performance.now() + sec * 1000;
    setDisplayRemainSec(sec);
    startRaf();
  }, [activePreset, displayRemainSec, startRaf, stageIndex, status]);

  const pause = useCallback(() => {
    if (status !== "running" || deadlineRef.current == null) return;
    const rem = Math.max(0, (deadlineRef.current - performance.now()) / 1000);
    setDisplayRemainSec(rem);
    deadlineRef.current = null;
    statusRef.current = "paused";
    setStatus("paused");
    stopRaf();
  }, [status, stopRaf]);

  const reset = useCallback(() => {
    stopRaf();
    deadlineRef.current = null;
    statusRef.current = "idle";
    setStatus("idle");
    setStageIndex(0);
    stageIndexRef.current = 0;
    syncDisplayForIdle();
  }, [stopRaf, syncDisplayForIdle]);

  useEffect(() => {
    if (status === "idle" || status === "done") {
      if (activePreset) {
        const i = status === "done" ? 0 : stageIndex;
        setDisplayRemainSec(
          activePreset.stagesSec[Math.min(i, activePreset.stagesSec.length - 1)] ?? 0
        );
      }
    }
  }, [activePreset, status, stageIndex]);

  useEffect(() => {
    if (status === "running" || status === "paused") return;
    syncDisplayForIdle();
  }, [activePresetId, status, syncDisplayForIdle]);

  const updateActivePreset = useCallback(
    (updater: (p: TimerPreset) => TimerPreset) => {
      setPresets((list) => {
        const i = list.findIndex((p) => p.id === activePresetId);
        if (i < 0) return list;
        const next = [...list];
        next[i] = updater(list[i]!);
        return next;
      });
    },
    [activePresetId]
  );

  const addPreset = useCallback(() => {
    const id = uid();
    setPresets((list) => [...list, { id, name: "新预设", stagesSec: [60] }]);
    setActivePresetId(id);
  }, []);

  const removeActivePreset = useCallback(() => {
    if (presets.length <= 1) return;
    const next = presets.filter((p) => p.id !== activePresetId);
    if (next[0]) {
      setActivePresetId(next[0].id);
      setPresets(next);
    }
  }, [activePresetId, presets]);

  /** 清除本地预设存储并恢复内置三组预设，同时复位计时显示（须在非运行态调用） */
  const restoreSystemPresets = useCallback(() => {
    stopRaf();
    deadlineRef.current = null;
    statusRef.current = "idle";
    setStatus("idle");
    setStageIndex(0);
    stageIndexRef.current = 0;
    clearStoredPresets();
    const defs = defaultPresets();
    activePresetRef.current = defs[0]!;
    setPresets(defs);
    setActivePresetId(defs[0]!.id);
    setDisplayRemainSec(defs[0]!.stagesSec[0] ?? 0);
  }, [stopRaf]);

  return {
    presets,
    setPresets,
    activePreset,
    activePresetId,
    setActivePresetId,
    loop,
    setLoop,
    status,
    stageIndex,
    displayRemainSec,
    currentStageSec,
    totalStages,
    formatHMS: () => formatHMS(displayRemainSec),
    startOrResume,
    pause,
    reset,
    updateActivePreset,
    addPreset,
    removeActivePreset,
    restoreSystemPresets,
  };
}
