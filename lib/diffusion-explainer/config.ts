import type { PresetId } from "./types";

// 配色
export const SOURCE_COLOR = "#667eea"; // 源分布 / 噪声 X₀ ~ N(0, I)
export const TARGET_COLOR = "#f4c25a"; // 目标分布 / 数据 X₁
export const CURVED_COLOR = "#8b5cf6"; // 曲线流（flow matching）轨迹
export const STRAIGHT_COLOR = "#22c55e"; // 拉直后的 rectified flow 轨迹
export const FIELD_COLOR = "#ec4899"; // 速度场箭头

// 二维数据域（高斯源约 3σ 落在 [-3,3]）
export const DOMAIN_MIN = -3;
export const DOMAIN_MAX = 3;

// 点数
export const NUM_POINTS = 320; // 目标分布点云（也用作速度场的经验支撑）
export const NUM_TRAJ = 140; // 动画里的轨迹/粒子数
export const FINE_STEPS = 120; // 求「真实」曲线流轨迹的积分步数

// 画布
export const CANVAS_SIZE = 440;

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: "smiley", label: "笑脸" },
  { id: "two-moons", label: "双月" },
  { id: "two-gaussians", label: "双高斯" },
  { id: "ring", label: "圆环" },
  { id: "spiral", label: "螺旋" },
  { id: "s-curve", label: "S 曲线" },
];
