/**
 * 访客自带 API Key —— 客户端本地存储 + 请求头注入。
 *
 * 公开部署时服务端默认不带 LLM key；访客在 /settings 填入自己的 key，
 * 仅存浏览器 localStorage（绝不上传到我们的服务器持久化），每次 AI 请求时
 * 通过 `x-deepseek-key` / `x-openai-key` / `x-gemini-key` 头带给对应路由。
 */

const STORAGE_KEY = 'paperweave:api-keys';

export interface UserKeys {
  deepseek?: string;
  openai?: string;
  gemini?: string;
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
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function hasAnyUserKey(): boolean {
  const k = getUserKeys();
  return !!(k.deepseek || k.openai || k.gemini);
}

/** 把已保存的 key 转成请求头，附加到 AI 请求上。 */
export function userKeyHeaders(): Record<string, string> {
  const k = getUserKeys();
  const h: Record<string, string> = {};
  if (k.deepseek) h['x-deepseek-key'] = k.deepseek;
  if (k.openai) h['x-openai-key'] = k.openai;
  if (k.gemini) h['x-gemini-key'] = k.gemini;
  return h;
}
