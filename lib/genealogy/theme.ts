/**
 * 研究方向族谱 —— 共享视觉常量。
 *
 * 角色配色 / 关系样式集中一处，供站内组件（GenealogyTree、图例、详情面板）
 * 与导出 SVG（export.ts）复用同一把尺子，避免「屏幕一套、导出另一套」。
 * 注意：连线一律用纯色 / rgba，规避 Turbopack dev 对嵌套 color-mix 的静默丢失坑。
 */

import type { NodeRole } from "./lineage";
import type { Relation } from "./lineage";

export const ROLE_GLYPH: Record<NodeRole, string> = {
  founder: "●",
  hub: "◉",
  frontier: "★",
  normal: "○",
};

export const ROLE_COLOR: Record<NodeRole, string> = {
  founder: "#d24b7f",
  hub: "#7c3aed",
  frontier: "#b8860b",
  normal: "#8a8377",
};

export const ROLE_LABEL: Record<NodeRole, string> = {
  founder: "奠基",
  hub: "枢纽",
  frontier: "前沿",
  normal: "节点",
};

export interface RelationStyle {
  label: string;
  color: string;
  /** SVG stroke-dasharray；undefined 为实线 */
  dash?: string;
  /** 是否双线（supersedes） */
  double?: boolean;
}

export const RELATION_STYLE: Record<Relation, RelationStyle> = {
  "builds-on": { label: "沿用/改进", color: "#6b6258" },
  "inspired-by": { label: "受启发", color: "#7c3aed", dash: "2 5" },
  supersedes: { label: "取代", color: "#a53425", double: true },
  parallel: { label: "并行", color: "#9a9286", dash: "1 6" },
};

/** 暖纸调底色令牌（导出 SVG 用，站内走 CSS 变量）。 */
export const PAPER = {
  bg: "#faf6ec",
  band: "rgba(26, 23, 19, 0.025)",
  line: "rgba(26, 23, 19, 0.10)",
  lineStrong: "rgba(26, 23, 19, 0.16)",
  ink: "#1a1713",
  ink2: "#46403a",
  ink3: "#7a736a",
  ink4: "#a89f93",
};
