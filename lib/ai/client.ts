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

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';
const GOOGLE_KEY = process.env.GOOGLE_API_KEY;

/** 各供应商当前主力模型（非流式默认） */
export const NON_STREAM_MODELS = {
  deepseek: 'deepseek-chat',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
} as const;

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

const PLACEHOLDERS = new Set(['', 'your-openai-key', 'your-deepseek-key', 'your_deepseek_key', 'your-gemini-key']);
const isReal = (k?: string): k is string => !!k && !PLACEHOLDERS.has(k);

async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function callDeepSeek(messages: Message[], model?: string, temperature = 0.3, max_tokens = 1000) {
  if (!isReal(DEEPSEEK_KEY)) throw new Error('DeepSeek key not configured');
  const url = `${DEEPSEEK_URL.replace(/\/$/, '')}/chat/completions`;
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_KEY}` },
    body: JSON.stringify({ model: model ?? NON_STREAM_MODELS.deepseek, messages, temperature, max_tokens }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`DeepSeek API error: ${res.status} ${res.statusText} ${text}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

async function callOpenAI(messages: Message[], model?: string, temperature = 0.3, max_tokens = 1000) {
  if (!isReal(OPENAI_KEY)) throw new Error('OpenAI key not configured');
  const client = new OpenAI({ apiKey: OPENAI_KEY });
  const res = await client.chat.completions.create({
    model: model ?? NON_STREAM_MODELS.openai,
    messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
    temperature,
    max_tokens,
  });
  return res.choices?.[0]?.message?.content ?? '';
}

async function callGemini(messages: Message[], _model?: string, temperature = 0.3, max_tokens = 1000) {
  if (!isReal(GOOGLE_KEY)) throw new Error('Gemini key not configured');
  const genAI = new GoogleGenerativeAI(GOOGLE_KEY);
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
 * 统一非流式补全：按 DeepSeek → OpenAI → Gemini 顺序尝试，首个成功即返回。
 */
export async function chatCompletion(
  messages: Message[],
  options?: { model?: string; temperature?: number; max_tokens?: number },
): Promise<string> {
  const { model, temperature = 0.3, max_tokens = 1000 } = options ?? {};

  const attempts: Array<{ name: string; fn: () => Promise<string> }> = [];
  if (isReal(DEEPSEEK_KEY)) attempts.push({ name: 'DeepSeek', fn: () => callDeepSeek(messages, model, temperature, max_tokens) });
  if (isReal(OPENAI_KEY)) attempts.push({ name: 'OpenAI', fn: () => callOpenAI(messages, model, temperature, max_tokens) });
  if (isReal(GOOGLE_KEY)) attempts.push({ name: 'Gemini', fn: () => callGemini(messages, model, temperature, max_tokens) });

  if (attempts.length === 0) {
    throw new Error('AI 服务未配置：请在 .env.local 设置 DEEPSEEK_API_KEY（或 OPENAI_API_KEY / GOOGLE_API_KEY）。');
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
