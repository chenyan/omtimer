export type TimerPreset = {
  id: string;
  name: string;
  /** 预设用途描述（简短说明） */
  desc: string;
  /** 每阶段时长（秒），须为正整数 */
  stagesSec: number[];
};

export type TimerRunStatus = "idle" | "running" | "paused" | "done";
