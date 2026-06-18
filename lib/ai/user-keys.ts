/**
 * 访客自带 API Key —— 客户端本地存储 + 请求头注入。
 *
 * 公开部署时服务端默认不带 LLM key；访客在 /settings 填入自己的 key，
 * 仅存浏览器 localStorage（绝不上传到我们的服务器持久化），每次 AI 请求时
 * 通过 `x-deepseek-key` / `x-openai-key` / `x-gemini-key` / `x-openrouter-key`
 * 头带给对应路由。填了 OpenRouter key 的访客还可选一个具体模型（见 lib/ai/models.ts），
 * 通过 `x-openrouter-model` 头随每次请求带上，服务端据此优先用该模型。
 */

import { isOpenRouterModel } from './models';

const STORAGE_KEY = 'paperweave:api-keys';
const MODEL_KEY = 'paperweave:model';

export interface UserKeys {
  deepseek?: string;
  openai?: string;
  gemini?: string;
  openrouter?: string;
}

export function getUserKeys(): UserKeys {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as UserKeys;
  } catch {
    return {};
  }
}

export function setUserKeys(keys: UserKeys): void {
  if (typeof window === 'undefined') return;
  const trimmed: UserKeys = {
    deepseek: keys.deepseek?.trim() || undefined,
    openai: keys.openai?.trim() || undefined,
    gemini: keys.gemini?.trim() || undefined,
    openrouter: keys.openrouter?.trim() || undefined,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function hasAnyUserKey(): boolean {
  const k = getUserKeys();
  return !!(k.deepseek || k.openai || k.gemini || k.openrouter);
}

/** 访客选中的 OpenRouter 模型 id（未选 / 非法返回空字符串）。 */
export function getSelectedModel(): string {
  if (typeof window === 'undefined') return '';
  const v = localStorage.getItem(MODEL_KEY) || '';
  return isOpenRouterModel(v) ? v : '';
}

/** 保存选中的 OpenRouter 模型（传空字符串=用内置默认链路）。 */
export function setSelectedModel(model: string): void {
  if (typeof window === 'undefined') return;
  if (model && isOpenRouterModel(model)) localStorage.setItem(MODEL_KEY, model);
  else localStorage.removeItem(MODEL_KEY);
}

/** 把已保存的 key（及选中的 OpenRouter 模型）转成请求头，附加到 AI 请求上。 */
export function userKeyHeaders(): Record<string, string> {
  const k = getUserKeys();
  const h: Record<string, string> = {};
  if (k.deepseek) h['x-deepseek-key'] = k.deepseek;
  if (k.openai) h['x-openai-key'] = k.openai;
  if (k.gemini) h['x-gemini-key'] = k.gemini;
  if (k.openrouter) h['x-openrouter-key'] = k.openrouter;
  // 仅在选了模型且确有 OpenRouter key 时才带模型头（否则服务端会忽略）
  const model = getSelectedModel();
  if (model && k.openrouter) h['x-openrouter-model'] = model;
  return h;
}
