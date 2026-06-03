import { OpenAI } from 'openai';

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

async function fetchWithTimeout(url: string, opts: any = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function callDeepSeek(messages: Message[], model?: string, temperature = 0.3, max_tokens = 1000) {
  if (!DEEPSEEK_KEY) throw new Error('DeepSeek key not configured');
  const url = `${DEEPSEEK_URL.replace(/\/$/, '')}/chat/completions`;
  const body = {
    model: model ?? 'deepseek-chat',
    messages: messages,
    temperature,
    max_tokens,
  };

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify(body),
  }, 30000);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`DeepSeek API error: ${res.status} ${res.statusText} ${text}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

async function callOpenAI(messages: Message[], model?: string, temperature = 0.3, max_tokens = 1000) {
  if (!OPENAI_KEY) throw new Error('OpenAI key not configured');
  const client = new OpenAI({ apiKey: OPENAI_KEY });
  const res = await client.chat.completions.create({
    model: model ?? 'gpt-4o-mini',
    messages: messages as any,
    temperature,
    max_tokens,
  });
  return res.choices?.[0]?.message?.content ?? '';
}

export async function chatCompletion(messages: Message[], options?: { model?: string; temperature?: number; max_tokens?: number; retry?: boolean; }) {
  const model = options?.model;
  const temperature = options?.temperature ?? 0.3;
  const max_tokens = options?.max_tokens ?? 1000;

  // Prefer OpenAI if API key present and looks non-placeholder; otherwise try DeepSeek first.
  const openaiAvailable = !!OPENAI_KEY && OPENAI_KEY !== 'your-openai-key';
  const deepseekAvailable = !!DEEPSEEK_KEY && DEEPSEEK_KEY !== 'your-deepseek-key';

  const attempts: Array<() => Promise<string>> = [];
  if (openaiAvailable) attempts.push(() => callOpenAI(messages, model, temperature, max_tokens));
  if (deepseekAvailable) attempts.push(() => callDeepSeek(messages, model, temperature, max_tokens));
  // If none available, still try OpenAI/DeepSeek with whatever env provides to produce clearer error
  if (attempts.length === 0) {
    if (OPENAI_KEY) attempts.push(() => callOpenAI(messages, model, temperature, max_tokens));
    if (DEEPSEEK_KEY) attempts.push(() => callDeepSeek(messages, model, temperature, max_tokens));
  }

  if (attempts.length === 0) {
    throw new Error('AI provider not configured. Set OPENAI_API_KEY or DEEPSEEK_API_KEY.');
  }

  let lastErr: any = null;
  for (const fn of attempts) {
    try {
      const out = await fn();
      if (out && typeof out === 'string') return out;
      // if empty string, still return (caller will handle empty)
      return out ?? '';
    } catch (e) {
      lastErr = e;
      // try next provider
    }
  }

  throw lastErr ?? new Error('All AI providers failed');
}

export type { Message };
