import { createDeepSeek } from "@ai-sdk/deepseek";

/** 默认 DeepSeek 客户端（环境变量 key）。流式路由优先用 getDeepSeek(perRequestKey)。 */
export const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
});

/** 用指定 key 构造 DeepSeek 客户端 —— 支持「访客自带 key」按请求注入。 */
export function getDeepSeek(apiKey: string) {
  return createDeepSeek({ apiKey });
}

export const MODELS = {
  chat: "deepseek-chat",
  reasoner: "deepseek-reasoner",
} as const;

const PLACEHOLDERS = new Set(["", "your-deepseek-key", "your_deepseek_key", "ci-placeholder"]);

/** 流式工具是否已配置可用的 DeepSeek key */
export function isStreamingAIConfigured(): boolean {
  const k = process.env.DEEPSEEK_API_KEY;
  return !!k && !PLACEHOLDERS.has(k);
}

/** 未配置 key 时给前端的清晰错误（被 StreamOutput 的 friendlyError 识别为「未配置 key」） */
export function aiNotConfiguredResponse(): Response {
  return new Response(
    "AI 服务未配置：请在右上角「API Key」里填入你自己的 DeepSeek key（本地开发可在 .env.local 设 DEEPSEEK_API_KEY）后重试。",
    { status: 503 },
  );
}
