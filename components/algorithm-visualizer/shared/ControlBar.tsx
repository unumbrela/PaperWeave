"use client";

import type { AnimationState } from "./types";
import s from "./shared.module.css";

export interface ControlBarProps {
  animState: AnimationState;
  currentStepIndex: number;
  totalSteps: number;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onReset: () => void;
  onSpeedChange: (ms: number) => void;
  onGoToStep: (index: number) => void;
}

export function ControlBar({
  animState,
  currentStepIndex,
  totalSteps,
  speed,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  onReset,
  onSpeedChange,
  onGoToStep,
}: ControlBarProps) {
  const isPlaying = animState === "playing";
  const sliderPct =
    totalSteps > 1
      ? (Math.max(0, currentStepIndex) / (totalSteps - 1)) * 100
      : 0;

  return (
    <div className={s.controlBar}>
      {isPlaying ? (
        <button className={`${s.controlBtn} ${s.pauseBtn}`} onClick={onPause}>
          ⏸ 暂停 <span className={s.shortcutHint}>[空格]</span>
        </button>
      ) : (
        <button className={`${s.controlBtn} ${s.playBtn}`} onClick={onPlay}>
          ▶ {animState === "completed" ? "重播" : "播放"}{" "}
          <span className={s.shortcutHint}>[空格]</span>
        </button>
      )}

      <button
        className={`${s.controlBtn} ${s.stepBackBtn}`}
        onClick={onStepBackward}
        disabled={currentStepIndex < 0 || isPlaying}
      >
        ⏮ 上一步 <span className={s.shortcutHint}>[←]</span>
      </button>
      <button
        className={`${s.controlBtn} ${s.stepFwdBtn}`}
        onClick={onStepForward}
        disabled={currentStepIndex >= totalSteps - 1 || isPlaying}
      >
        ⏭ 下一步 <span className={s.shortcutHint}>[→]</span>
      </button>
      <button
        className={`${s.controlBtn} ${s.resetBtn}`}
        onClick={onReset}
        disabled={animState === "idle"}
      >
        ↺ 重置
      </button>

      <div className={s.speedControl}>
        <span className={s.speedLabel}>速度</span>
        <input
          type="range"
          min={100}
          max={2000}
          step={100}
          value={2100 - speed}
          onChange={(e) => onSpeedChange(2100 - Number(e.target.value))}
          className={s.speedSlider}
        />
        <span className={s.speedValue}>{speed}ms</span>
      </div>

      <div className={s.stepIndicator}>
        <span className={s.stepText}>
          {currentStepIndex + 1} / {totalSteps}
        </span>
        <input
          type="range"
          className={s.stepSlider}
          min={0}
          max={totalSteps - 1}
          value={Math.max(0, currentStepIndex)}
          onChange={(e) => onGoToStep(Number(e.target.value))}
          style={{
            background: `linear-gradient(to right, #4CAF50 0%, #4CAF50 ${sliderPct}%, var(--line, #ddd) ${sliderPct}%, var(--line, #ddd) 100%)`,
          }}
        />
      </div>
    </div>
  );
}
