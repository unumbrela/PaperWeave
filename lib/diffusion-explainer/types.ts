// Rectified Flow 交互式讲解的核心类型。
// 全部 DOM-free，便于在 node 环境单测。

export type Vec2 = [number, number];

export type PresetId =
  | "two-moons"
  | "spiral"
  | "ring"
  | "two-gaussians"
  | "s-curve"
  | "smiley"
  | "draw";

/** 一条流的轨迹（从源点到数据点，按时间采样）。 */
export type Trajectory = Vec2[];

/** 流的模式：曲线流（flow matching）或拉直后的 rectified flow。 */
export type FlowMode = "curved" | "rectified";

/** 配对方式：独立耦合 vs 重流诱导的耦合。 */
export type CouplingType = "independent" | "rectified";
