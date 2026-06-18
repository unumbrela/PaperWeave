/**
 * 非流式 LLM 客户端 —— 全站「一次性返回」类 AI 调用的统一入口。
 *
 * 供应商优先级（与项目默认一致）：**DeepSeek 主 → OpenAI 备 → Gemini 备**。
 * 主供应商失败自动 fallback 到下一家，单点故障不致全站 AI 瘫痪。
 * 每次调用带超时；任一家成功即返回。
 *
 * 流式调用走 `@/lib/ai`（Vercel AI SDK），与本模块分工明确。
 */

import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ResolvedKeys } from './keys';
import { OPENROUTER_URL, OPENROUTER_HEADERS } from './openrouter';
import { DEFAULT_OPENROUTER_MODEL } from './models';

const DEEPSEEK_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';

/** 各供应商当前主力模型（非流式默认） */
export const NON_STREAM_MODELS = {
  deepseek: 'deepseek-chat',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
} as const;

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

const PLACEHOLDERS = new Set(['', 'your-openai-key', 'your-deepseek-key', 'your_deepseek_key', 'your-gemini-key', 'your-openrouter-key', 'ci-placeholder']);
const isReal = (k?: string): k is string => !!k && !PLACEHOLDERS.has(k);

/** 把「访客自带 key」覆盖到环境变量之上，得到本次调用实际可用的 key */
function effectiveKeys(override?: ResolvedKeys) {
  return {
    deepseek: override?.deepseek ?? process.env.DEEPSEEK_API_KEY,
    openai: override?.openai ?? process.env.OPENAI_API_KEY,
    gemini: override?.gemini ?? process.env.GOOGLE_API_KEY,
    openrouter: override?.openrouter ?? process.env.OPENROUTER_API_KEY,
  };
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function callDeepSeek(messages: Message[], key: string, model?: string, temperature = 0.3, max_tokens = 1000) {
  const url = `${DEEPSEEK_URL.replace(/\/$/, '')}/chat/completions`;
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: model ?? NON_STREAM_MODELS.deepseek, messages, temperature, max_tokens }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`DeepSeek API error: ${res.status} ${res.statusText} ${text}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

async function callOpenAI(messages: Message[], key: string, model?: string, temperature = 0.3, max_tokens = 1000) {
  const client = new OpenAI({ apiKey: key });
  const res = await client.chat.completions.create({
    model: model ?? NON_STREAM_MODELS.openai,
    messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
    temperature,
    max_tokens,
  });
  return res.choices?.[0]?.message?.content ?? '';
}

/** OpenRouter（OpenAI 兼容网关）：用访客选中的模型一次性补全。 */
async function callOpenRouter(messages: Message[], key: string, model: string, temperature = 0.3, max_tokens = 1000) {
  const client = new OpenAI({ apiKey: key, baseURL: OPENROUTER_URL, defaultHeaders: OPENROUTER_HEADERS });
  const res = await client.chat.completions.create({
    model,
    messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
    temperature,
    max_tokens,
  });
  return res.choices?.[0]?.message?.content ?? '';
}

async function callGemini(messages: Message[], key: string, _model?: string, temperature = 0.3, max_tokens = 1000) {
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: NON_STREAM_MODELS.gemini,
    generationConfig: { temperature, maxOutputTokens: max_tokens },
  });
  // 把 system 合入首条 user，Gemini 无独立 system role
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
  const convo = messages.filter((m) => m.role !== 'system').map((m) => m.content).join('\n\n');
  const result = await model.generateContent(system ? `${system}\n\n${convo}` : convo);
  return result.response.text() ?? '';
}

/**
 * 统一非流式补全：访客若选定 OpenRouter 模型则优先用它，
 * 之后按 DeepSeek → OpenAI → Gemini 顺序兜底，首个成功即返回。
 */
export async function chatCompletion(
  messages: Message[],
  options?: { model?: string; temperature?: number; max_tokens?: number },
  keys?: ResolvedKeys,
): Promise<string> {
  const { model, temperature = 0.3, max_tokens = 1000 } = options ?? {};
  const eff = effectiveKeys(keys);

  const attempts: Array<{ name: string; fn: () => Promise<string> }> = [];
  // 访客显式选定的 OpenRouter 模型 → 作为主供应商（DeepSeek 等仍作兜底）
  if (keys?.openrouterModel && isReal(eff.openrouter))
    attempts.push({ name: `OpenRouter(${keys.openrouterModel})`, fn: () => callOpenRouter(messages, eff.openrouter!, keys.openrouterModel!, temperature, max_tokens) });
  if (isReal(eff.deepseek)) attempts.push({ name: 'DeepSeek', fn: () => callDeepSeek(messages, eff.deepseek!, model, temperature, max_tokens) });
  if (isReal(eff.openai)) attempts.push({ name: 'OpenAI', fn: () => callOpenAI(messages, eff.openai!, model, temperature, max_tokens) });
  if (isReal(eff.gemini)) attempts.push({ name: 'Gemini', fn: () => callGemini(messages, eff.gemini!, model, temperature, max_tokens) });
  // 仅配了 OpenRouter key 又没选型时，用兜底模型保证可用（不抢内置供应商的默认位）
  if (isReal(eff.openrouter) && !keys?.openrouterModel)
    attempts.push({ name: `OpenRouter(${DEFAULT_OPENROUTER_MODEL})`, fn: () => callOpenRouter(messages, eff.openrouter!, DEFAULT_OPENROUTER_MODEL, temperature, max_tokens) });

  if (attempts.length === 0) {
    throw new Error('AI 服务未配置：请在右上角「API Key」填入你自己的 key（本地开发可在 .env.local 设 DEEPSEEK_API_KEY / OPENAI_API_KEY / GOOGLE_API_KEY / OPENROUTER_API_KEY）。');
  }

  let lastErr: unknown = null;
  for (const { name, fn } of attempts) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      console.warn(`[chatCompletion] ${name} 失败，尝试下一供应商:`, e instanceof Error ? e.message : e);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('所有 AI 供应商均失败');
}

export type { Message };
