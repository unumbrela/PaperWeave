/**
 * 服务端 API Key 解析 ——「访客自带 key」的核心。
 *
 * 公开部署时服务端默认不带任何 LLM key；访客在 /settings 里填入自己的 key，
 * 前端通过请求头 `x-deepseek-key` / `x-openai-key` / `x-gemini-key` / `x-openrouter-key`
 * 带上来。本模块按「请求头优先 → 环境变量兜底」解析出本次请求实际可用的 key。
 *
 * OpenRouter 是「一个 key 解锁多家模型」的统一网关：填了 OpenRouter key 后，
 * 访客还会用 `x-openrouter-model` 头指明想用的具体模型（见 lib/ai/models.ts）。
 *
 * 这样：① 公开 demo 不花站长的钱、不会被刷爆；② 本地开发仍可只配 .env.local。
 */

import { isOpenRouterModel } from './models';

const PLACEHOLDERS = new Set([
  '',
  'your-deepseek-key',
  'your_deepseek_key',
  'your-openai-key',
  'your-gemini-key',
  'your-openrouter-key',
  'ci-placeholder',
]);

const clean = (v?: string | null): string | undefined => {
  const t = v?.trim();
  return t && !PLACEHOLDERS.has(t) ? t : undefined;
};

export interface ResolvedKeys {
  deepseek?: string;
  openai?: string;
  gemini?: string;
  openrouter?: string;
  /** 访客选中的 OpenRouter 模型 id（仅当为受支持模型时才采纳） */
  openrouterModel?: string;
}

/** 从请求头（访客自带）+ 环境变量（兜底）解析出可用 key。 */
export function resolveKeys(req: Request): ResolvedKeys {
  const h = req.headers;
  const model = clean(h.get('x-openrouter-model'));
  return {
    deepseek: clean(h.get('x-deepseek-key')) ?? clean(process.env.DEEPSEEK_API_KEY),
    openai: clean(h.get('x-openai-key')) ?? clean(process.env.OPENAI_API_KEY),
    gemini: clean(h.get('x-gemini-key')) ?? clean(process.env.GOOGLE_API_KEY),
    openrouter: clean(h.get('x-openrouter-key')) ?? clean(process.env.OPENROUTER_API_KEY),
    openrouterModel: isOpenRouterModel(model) ? model : undefined,
  };
}

/** 本次请求是否至少有一个可用 LLM key。 */
export function hasAnyKey(keys: ResolvedKeys): boolean {
  return !!(keys.deepseek || keys.openai || keys.gemini || keys.openrouter);
}
