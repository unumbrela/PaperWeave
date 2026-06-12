/**
 * 多供应商流式补全 —— 把 chatCompletion 的「DeepSeek→OpenAI→Gemini fallback」
 * 能力带到**流式**输出。返回一个 UTF-8 文本 `ReadableStream`，供前端 useStream 逐字读。
 *
 * 关键点：fallback 只在「某供应商在吐出第一个 token 前就失败」时发生（换下一家）；
 * 一旦开始流式输出就不再回退（已发出的字节无法撤回）——与所有流式实现一致。
 *
 * 这解决了原 `lib/ai.ts`（仅 DeepSeek）的局限：语义检索用户可能只有 OpenAI/Gemini
 * key，照样能流式拿到 RAG 答案。
 */

import { OpenAI } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ResolvedKeys } from "./keys";
import type { Message } from "./client";

const DEEPSEEK_URL = process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1";

const PLACEHOLDERS = new Set([
  "",
  "your-openai-key",
  "your-deepseek-key",
  "your_deepseek_key",
  "your-gemini-key",
  "ci-placeholder",
]);
const isReal = (k?: string): k is string => !!k && !PLACEHOLDERS.has(k);

/**
 * 未配置任何 LLM key 时给前端的清晰错误。
 * 消费方是 useStream 的 `res.text()`（裸文本），文案含「未配置」可被
 * StreamOutput 的 friendlyError 归类为「key 未配置」并给出处置建议。
 */
export function aiNotConfiguredResponse(): Response {
  return new Response(
    "AI 服务未配置：请在右上角「API Key」填入你自己的 key（DeepSeek / OpenAI / Gemini 任一）；本地开发也可在 .env.local 配置后重试。",
    { status: 503 },
  );
}

export interface StreamOpts {
  temperature?: number;
  max_tokens?: number;
  /**
   * DeepSeek 档位覆盖（如 idea-generator 用 "deepseek-reasoner"）。
   * 仅影响 DeepSeek attempt；fallback 到 OpenAI/Gemini 时仍用各家默认 chat 模型
   * ——流式场景下「有产出 > 死路」，接受推理深度降级。
   */
  deepseekModel?: string;
}

/** OpenAI 兼容端点（OpenAI 本体或 DeepSeek，靠 baseURL 区分）的文本增量流。 */
async function* openaiCompatStream(
  messages: Message[],
  key: string,
  model: string,
  baseURL: string | undefined,
  opts: StreamOpts,
): AsyncGenerator<string> {
  const client = new OpenAI({ apiKey: key, ...(baseURL ? { baseURL } : {}) });
  const stream = await client.chat.completions.create({
    model,
    messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.max_tokens ?? 1200,
    stream: true,
  });
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) yield delta;
  }
}

/** Gemini 文本增量流（无独立 system role，合入首条）。 */
async function* geminiStream(
  messages: Message[],
  key: string,
  opts: StreamOpts,
): AsyncGenerator<string> {
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { temperature: opts.temperature ?? 0.3, maxOutputTokens: opts.max_tokens ?? 1200 },
  });
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const convo = messages.filter((m) => m.role !== "system").map((m) => m.content).join("\n\n");
  const result = await model.generateContentStream(system ? `${system}\n\n${convo}` : convo);
  for await (const chunk of result.stream) {
    const t = chunk.text();
    if (t) yield t;
  }
}

function effectiveKeys(override?: ResolvedKeys) {
  return {
    deepseek: override?.deepseek ?? process.env.DEEPSEEK_API_KEY,
    openai: override?.openai ?? process.env.OPENAI_API_KEY,
    gemini: override?.gemini ?? process.env.GOOGLE_API_KEY,
  };
}

/**
 * 按 DeepSeek→OpenAI→Gemini 顺序，返回首个能产出内容的文本流。
 * `onComplete` 在流正常结束时回调（用于埋点），出错不调用。
 */
export async function streamChat(
  messages: Message[],
  opts: StreamOpts,
  keys?: ResolvedKeys,
  onComplete?: (meta: { provider: string }) => void,
): Promise<ReadableStream<Uint8Array>> {
  const eff = effectiveKeys(keys);
  const attempts: Array<{ provider: string; gen: () => AsyncGenerator<string> }> = [];
  if (isReal(eff.deepseek))
    attempts.push({ provider: "deepseek", gen: () => openaiCompatStream(messages, eff.deepseek!, opts.deepseekModel ?? "deepseek-chat", DEEPSEEK_URL, opts) });
  if (isReal(eff.openai))
    attempts.push({ provider: "openai", gen: () => openaiCompatStream(messages, eff.openai!, "gpt-4o-mini", undefined, opts) });
  if (isReal(eff.gemini))
    attempts.push({ provider: "gemini", gen: () => geminiStream(messages, eff.gemini!, opts) });

  if (attempts.length === 0) {
    throw new Error(
      "AI 服务未配置：请在右上角「API Key」填入你自己的 key（DeepSeek / OpenAI / Gemini 任一）。",
    );
  }

  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let lastErr: unknown = null;
      for (const { provider, gen } of attempts) {
        try {
          const it = gen();
          // 先拉第一个分片：成功才「提交」到该供应商，失败则换下一家
          const first = await it.next();
          if (!first.done && first.value) controller.enqueue(encoder.encode(first.value));
          for await (const piece of it) controller.enqueue(encoder.encode(piece));
          controller.close();
          onComplete?.({ provider });
          return;
        } catch (e) {
          lastErr = e;
          console.warn(`[streamChat] ${provider} 失败，尝试下一供应商:`, e instanceof Error ? e.message : e);
        }
      }
      controller.error(lastErr instanceof Error ? lastErr : new Error("所有 AI 供应商均失败"));
    },
  });
}
