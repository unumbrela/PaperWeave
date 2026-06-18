/**
 * OpenRouter 模型目录 —— 「填一个 OpenRouter key 解锁多家模型」的核心。
 *
 * OpenRouter 是 OpenAI 兼容的统一网关，一个 key 即可访问 Anthropic / OpenAI /
 * Google / DeepSeek / Qwen / Llama 等数百个模型（按用量计费）。本站只精选一批
 * 「适合学术论文场景、好用且性价比合理」的型号呈现给用户，避免 300+ 模型的选择负担。
 *
 * 选中某个模型后，全站 AI 调用（流式 + 非流式）会**优先**走 OpenRouter 用该模型，
 * 失败再回退到内置的 DeepSeek → OpenAI → Gemini 链路（见 lib/ai/client.ts / stream.ts）。
 */

export type ModelTier = "旗舰" | "均衡" | "经济" | "推理";

export interface OpenRouterModel {
  /** OpenRouter 模型 id，如 "anthropic/claude-sonnet-4.5" */
  id: string;
  /** 展示名 */
  label: string;
  /** 出品方（用于分组/标识） */
  vendor: string;
  tier: ModelTier;
  /** 一句话适用场景 */
  hint: string;
  /**
   * 闭源供应商（Anthropic / OpenAI / Google）：需在 OpenRouter 后台开启数据策略后才可路由，
   * 否则会返回 403。开源权重模型（DeepSeek / Qwen / Llama）无此要求。
   */
  needsDataPolicy?: boolean;
}

/**
 * 精选模型清单（OpenRouter id 均已校验存在）。
 * 顺序即推荐顺序：综合最强 → 性价比 → 推理 → 开源。
 */
export const OPENROUTER_MODELS: OpenRouterModel[] = [
  {
    id: "anthropic/claude-sonnet-4.5",
    label: "Claude Sonnet 4.5",
    vendor: "Anthropic",
    tier: "旗舰",
    hint: "综合最强，长文写作与论文分析首选，1M 上下文。",
    needsDataPolicy: true,
  },
  {
    id: "openai/gpt-4.1",
    label: "GPT-4.1",
    vendor: "OpenAI",
    tier: "旗舰",
    hint: "OpenAI 旗舰通用模型，1M 上下文，指令遵循稳。",
    needsDataPolicy: true,
  },
  {
    id: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    vendor: "Google",
    tier: "旗舰",
    hint: "Google 旗舰推理，超长上下文，擅长跨多篇综合。",
    needsDataPolicy: true,
  },
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    vendor: "Google",
    tier: "均衡",
    hint: "极快 + 超长上下文 + 便宜，日常速读/总结性价比首选。",
    needsDataPolicy: true,
  },
  {
    id: "deepseek/deepseek-r1",
    label: "DeepSeek R1",
    vendor: "DeepSeek",
    tier: "推理",
    hint: "深度推理链，适合 idea 生成与研究规划，价格低。",
  },
  {
    id: "qwen/qwen-2.5-72b-instruct",
    label: "Qwen 2.5 72B",
    vendor: "Qwen",
    tier: "经济",
    hint: "中文友好的开源旗舰，中文论文场景表现好。",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B",
    vendor: "Meta",
    tier: "经济",
    hint: "开源通用模型，便宜稳定，适合大批量调用。",
  },
];

/**
 * 仅有 OpenRouter key 但未显式选型时的兜底模型。
 * 选开源权重的 Qwen：无需账户开启隐私策略即可路由（闭源 Claude/GPT/Gemini 需用户在
 * OpenRouter 后台开启数据策略后才可用），且中文表现好——契合本站学术中文场景。
 */
export const DEFAULT_OPENROUTER_MODEL = "qwen/qwen-2.5-72b-instruct";

const MODEL_IDS = new Set(OPENROUTER_MODELS.map((m) => m.id));

/** 给定 id 是否为受支持的精选 OpenRouter 模型。 */
export function isOpenRouterModel(id?: string | null): id is string {
  return !!id && MODEL_IDS.has(id);
}

/** 按 id 取模型元信息。 */
export function getOpenRouterModel(id?: string | null): OpenRouterModel | undefined {
  return id ? OPENROUTER_MODELS.find((m) => m.id === id) : undefined;
}
