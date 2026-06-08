/**
 * 文本向量化 —— 语义检索（RAG）的 embedding 层。
 *
 * 供应商：**OpenAI `text-embedding-3-small`（1536 维）主 → Gemini
 * `text-embedding-004`（768 维）备**。DeepSeek 暂无 embedding 接口，故不参与。
 * key 来自「访客自带」（resolveKeys）。两家维度不同，故返回里带 `model`，
 * 调用方据此保证「同模型才比较」（混维度无意义）。
 */

import { OpenAI } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ResolvedKeys } from "./keys";

export const EMBED_MODELS = {
  openai: "text-embedding-3-small",
  gemini: "text-embedding-004",
} as const;

export interface EmbedResult {
  /** 形如 "openai:text-embedding-3-small"，跨会话标识向量空间 */
  model: string;
  vectors: number[][];
}

/** 本次请求是否具备可做 embedding 的 key（OpenAI 或 Gemini）。 */
export function canEmbed(keys: ResolvedKeys): boolean {
  return !!(keys.openai || keys.gemini);
}

async function embedOpenAI(texts: string[], key: string): Promise<EmbedResult> {
  const client = new OpenAI({ apiKey: key });
  const res = await client.embeddings.create({
    model: EMBED_MODELS.openai,
    input: texts,
  });
  // 按 index 排序，确保与输入顺序对齐
  const vectors = [...res.data]
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding as number[]);
  return { model: `openai:${EMBED_MODELS.openai}`, vectors };
}

async function embedGemini(texts: string[], key: string): Promise<EmbedResult> {
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: EMBED_MODELS.gemini });
  const out = await Promise.all(texts.map((t) => model.embedContent(t)));
  return {
    model: `gemini:${EMBED_MODELS.gemini}`,
    vectors: out.map((o) => o.embedding.values as number[]),
  };
}

/**
 * 把文本批量向量化。OpenAI 优先；失败或无 key 时回退 Gemini。
 * 两家都不可用时抛出可读错误（前端提示去填 OpenAI/Gemini key）。
 */
export async function embedTexts(texts: string[], keys: ResolvedKeys): Promise<EmbedResult> {
  if (texts.length === 0) return { model: "none", vectors: [] };

  let lastErr: unknown = null;
  if (keys.openai) {
    try {
      return await embedOpenAI(texts, keys.openai);
    } catch (e) {
      lastErr = e;
      console.warn("[embedTexts] OpenAI 失败，尝试 Gemini:", e instanceof Error ? e.message : e);
    }
  }
  if (keys.gemini) {
    try {
      return await embedGemini(texts, keys.gemini);
    } catch (e) {
      lastErr = e;
      console.warn("[embedTexts] Gemini 失败:", e instanceof Error ? e.message : e);
    }
  }

  if (lastErr) throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  throw new Error(
    "语义检索需要 OpenAI 或 Gemini 的 API key（DeepSeek 暂无 embedding 接口）。请在右上角「API Key」填入 OpenAI 或 Gemini key。",
  );
}
