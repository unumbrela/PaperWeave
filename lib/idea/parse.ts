/**
 * 从设计阶段模型输出里抽取结构化 IdeaSet。
 *
 * 设计 prompt 要求模型在末尾输出一个 ```json 代码块：
 *   { "ideas": [ { title, motivation, hypothesis, experiment, resources, risk,
 *                  novelty, feasibility, lens } ], "priority": "..." }
 * 但 LLM 输出未必规矩（可能裸 JSON、可能前后带散文、可能截断）。本模块层层兜底，
 * 任何一步失败都回退到把原文塞进 raw，由前端用 <Markdown> 兜底渲染，绝不抛错。
 */

import type { Idea, IdeaSet } from "./types";

/** 从文本里捞出最可能是 JSON 对象的那一段。 */
function extractJsonBlock(text: string): string | null {
  // ① 优先 ```json ... ``` 围栏
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1].trim()) return fenced[1].trim();
  // ② 退而求其次：取最外层 JSON（对象 {…} 或数组 […]，谁先出现取谁）
  const starts = [text.indexOf("{"), text.indexOf("[")].filter((i) => i !== -1);
  const ends = [text.lastIndexOf("}"), text.lastIndexOf("]")];
  const start = starts.length ? Math.min(...starts) : -1;
  const end = Math.max(...ends);
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return null;
}

const clampScore = (v: unknown): number => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, n));
};

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function normalizeIdea(raw: unknown, i: number): Idea | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = str(o.title);
  if (!title) return null;
  return {
    id: `idea-${i + 1}`,
    title,
    motivation: str(o.motivation),
    hypothesis: str(o.hypothesis),
    experiment: str(o.experiment),
    resources: str(o.resources),
    risk: str(o.risk),
    novelty: clampScore(o.novelty),
    feasibility: clampScore(o.feasibility),
    lens: str(o.lens) || undefined,
  };
}

/**
 * 解析设计阶段输出。永不抛错：
 * - 成功 → { ideas, priority }
 * - 失败 → { ideas: [], priority: "", raw: text }（前端走 Markdown 兜底）
 */
export function parseIdeaSet(text: string): IdeaSet {
  const fallback: IdeaSet = { ideas: [], priority: "", raw: text };
  const block = extractJsonBlock(text);
  if (!block) return fallback;

  let data: unknown;
  try {
    data = JSON.parse(block);
  } catch {
    return fallback;
  }

  // 允许两种顶层形态：{ideas,priority} 或直接是 ideas 数组
  const rawIdeas = Array.isArray(data)
    ? data
    : Array.isArray((data as Record<string, unknown>)?.ideas)
      ? ((data as Record<string, unknown>).ideas as unknown[])
      : null;
  if (!rawIdeas) return fallback;

  const ideas = rawIdeas
    .map((r, i) => normalizeIdea(r, i))
    .filter((x): x is Idea => x !== null);
  if (ideas.length === 0) return fallback;

  const priority = Array.isArray(data)
    ? ""
    : str((data as Record<string, unknown>).priority);

  return { ideas, priority };
}

/** 推荐项：综合分（创新 + 可行）最高者；并列时取可行性更高的。 */
export function pickRecommended(ideas: Idea[]): Idea | null {
  if (ideas.length === 0) return null;
  return [...ideas].sort(
    (a, b) =>
      b.novelty + b.feasibility - (a.novelty + a.feasibility) ||
      b.feasibility - a.feasibility,
  )[0];
}
