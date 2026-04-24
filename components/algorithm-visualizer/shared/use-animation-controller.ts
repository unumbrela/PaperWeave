import { useState, useCallback, useRef, useEffect } from "react";
import type { AnimationState } from "./types";

export function useAnimationController<T>(
  steps: T[],
  onStepChange: (step: T, index: number) => void,
) {
  const [state, setState] = useState<AnimationState>("idle");
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [speed, setSpeedRaw] = useState(500);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const executeStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < steps.length) {
        setCurrentStepIndex(index);
        onStepChange(steps[index], index);
        if (index === steps.length - 1) {
          setState("completed");
          clearTimer();
        }
      }
    },
    [steps, onStepChange, clearTimer],
  );

  const play = useCallback(() => {
    if (steps.length === 0) return;
    if (state === "completed") setCurrentStepIndex(-1);
    setState("playing");
  }, [steps.length, state]);

  const pause = useCallback(() => {
    setState("paused");
    clearTimer();
  }, [clearTimer]);

  const stepForward = useCallback(() => {
    if (!steps.length) return;
    const next = currentStepIndex + 1;
    if (next < steps.length) {
      executeStep(next);
      if (state === "idle") setState("paused");
    }
  }, [steps.length, currentStepIndex, executeStep, state]);

  const stepBackward = useCallback(() => {
    if (!steps.length) return;
    const prev = currentStepIndex - 1;
    if (prev >= 0) {
      executeStep(prev);
      if (state === "completed") setState("paused");
    } else if (currentStepIndex === 0) {
      setCurrentStepIndex(-1);
      setState("idle");
    }
  }, [steps.length, currentStepIndex, executeStep, state]);

  const goToStep = useCallback(
    (index: number) => {
      if (!steps.length || index < 0 || index >= steps.length) return;
      clearTimer();
      executeStep(index);
      if (state === "playing" || state === "idle") setState("paused");
    },
    [steps.length, executeStep, clearTimer, state],
  );

  const reset = useCallback(() => {
    clearTimer();
    setState("idle");
    setCurrentStepIndex(-1);
  }, [clearTimer]);

  const setSpeed = useCallback((ms: number) => {
    setSpeedRaw(Math.max(100, Math.min(2000, ms)));
  }, []);

  // Auto-play timer
  useEffect(() => {
    if (state === "playing") {
      clearTimer();
      const tick = () => {
        setCurrentStepIndex((prev) => {
          const next = prev + 1;
          if (next < steps.length) {
            onStepChange(steps[next], next);
            if (next === steps.length - 1) {
              setState("completed");
              clearTimer();
            }
            return next;
          }
          return prev;
        });
      };
      if (currentStepIndex === -1) tick();
      intervalRef.current = setInterval(tick, speed);
    }
    return () => {
      if (state !== "playing") clearTimer();
    };
  }, [state, speed, steps, onStepChange, clearTimer, currentStepIndex]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return {
    state,
    currentStepIndex,
    speed,
    play,
    pause,
    stepForward,
    stepBackward,
    reset,
    setSpeed,
    goToStep,
  };
}
