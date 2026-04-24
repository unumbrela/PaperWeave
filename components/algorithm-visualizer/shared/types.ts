export type AnimationState = "idle" | "playing" | "paused" | "completed";

/** Generic step — each algorithm extends with its own fields */
export interface BaseStep {
  description: string;
}
