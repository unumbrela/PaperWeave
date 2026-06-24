/**
 * ZenMux 模型目录 —— 「填一个 ZenMux key 解锁多家高级模型」的核心。
 *
 * ZenMux 是 OpenAI 兼容的统一网关，一个 key 即可访问 Anthropic / OpenAI / Google /
 * DeepSeek / Qwen 等数百个模型（按用量计费）。本站只精选一批「适合学术论文场景、
 * 好用且性价比合理」的型号呈现给用户，避免上百模型的选择负担。
 *
 * 选中某个模型后，全站 AI 调用（流式 + 非流式）会**优先**走 ZenMux 用该模型，
 * 失败再回退到内置的 DeepSeek → OpenAI → Gemini 链路（见 lib/ai/client.ts / stream.ts）。
 * 即：DeepSeek 仍是默认；ZenMux 负责解锁与提供更高级的模型。
 */

export type ModelTier = "旗舰" | "均衡" | "经济" | "推理";

export interface ZenMuxModel {
  /** ZenMux 模型 id，如 "anthropic/claude-sonnet-4.6" */
  id: string;
  /** 展示名 */
  label: string;
  /** 出品方（用于分组/标识） */
  vendor: string;
  tier: ModelTier;
  /** 一句话适用场景 */
  hint: string;
}

/**
 * 精选模型清单（ZenMux id 均已校验存在并成功调用）。
 * 顺序即推荐顺序：综合最强 → 性价比 → 推理 → 中文经济。
 */
export const ZENMUX_MODELS: ZenMuxModel[] = [
  {
    id: "anthropic/claude-opus-4.8",
    label: "Claude Opus 4.8",
    vendor: "Anthropic",
    tier: "旗舰",
    hint: "最强综合推理，复杂论文深读与严谨长文写作首选（价格较高）。",
  },
  {
    id: "anthropic/claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
    vendor: "Anthropic",
    tier: "旗舰",
    hint: "综合与性价比最佳平衡，长文写作与论文分析日常首选。",
  },
  {
    id: "openai/gpt-5.2",
    label: "GPT-5.2",
    vendor: "OpenAI",
    tier: "旗舰",
    hint: "OpenAI 旗舰通用模型，指令遵循稳，长上下文可靠。",
  },
  {
    id: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    vendor: "Google",
    tier: "旗舰",
    hint: "超长上下文推理，擅长跨多篇文献综合与抽取。",
  },
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    vendor: "Google",
    tier: "均衡",
    hint: "极快 + 超长上下文 + 便宜，日常速读 / 总结性价比首选。",
  },
  {
    id: "deepseek/deepseek-reasoner",
    label: "DeepSeek Reasoner",
    vendor: "DeepSeek",
    tier: "推理",
    hint: "深度推理链，适合创新点立论与研究规划，价格低。",
  },
  {
    id: "qwen/qwen3-max",
    label: "Qwen3 Max",
    vendor: "Qwen（阿里）",
    tier: "经济",
    hint: "中文友好的旗舰，中文论文场景表现好，性价比高。",
  },
];

/**
 * 仅有 ZenMux key 但未显式选型时的兜底模型（不抢内置 DeepSeek 的默认位，仅在「只配了
 * ZenMux key 且没选型」这一情形触发）。选 Gemini 2.5 Flash：快、便宜、超长上下文、
 * 输出格式稳定，适合做无人值守的安全兜底；想要中文旗舰可在设置里显式选 Qwen3 Max。
 */
export const DEFAULT_ZENMUX_MODEL = "google/gemini-2.5-flash";

const MODEL_IDS = new Set(ZENMUX_MODELS.map((m) => m.id));

/** 给定 id 是否为受支持的精选 ZenMux 模型。 */
export function isZenMuxModel(id?: string | null): id is string {
  return !!id && MODEL_IDS.has(id);
}

/** 按 id 取模型元信息。 */
export function getZenMuxModel(id?: string | null): ZenMuxModel | undefined {
  return id ? ZENMUX_MODELS.find((m) => m.id === id) : undefined;
}
