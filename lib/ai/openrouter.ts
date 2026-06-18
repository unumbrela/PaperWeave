/**
 * OpenRouter 接入常量 —— baseURL 与「归属」请求头。
 *
 * OpenRouter 要求带 `HTTP-Referer` / `X-Title` 做来源归属，否则部分上游供应商
 * （如 OpenAI）会以 ToS 为由拒绝（403）。两处调用（client.ts 非流式 / stream.ts
 * 流式）共用本文件，保证行为一致。
 */

export const OPENROUTER_URL = process.env.OPENROUTER_API_URL || "https://openrouter.ai/api/v1";

/** OpenAI SDK 的 defaultHeaders（归属信息，OpenRouter 要求）。 */
export const OPENROUTER_HEADERS: Record<string, string> = {
  "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://paperweave.app",
  "X-Title": process.env.OPENROUTER_SITE_NAME || "PaperWeave",
};
