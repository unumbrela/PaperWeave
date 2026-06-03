import { createDeepSeek } from "@ai-sdk/deepseek";

export const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export const MODELS = {
  chat: "deepseek-chat",
  reasoner: "deepseek-reasoner",
} as const;

const PLACEHOLDERS = new Set(["", "your-deepseek-key", "your_deepseek_key"]);

/** 流式工具是否已配置可用的 DeepSeek key */
export function isStreamingAIConfigured(): boolean {
  const k = process.env.DEEPSEEK_API_KEY;
  return !!k && !PLACEHOLDERS.has(k);
}

/** 未配置时给前端的清晰错误（被 StreamOutput 的 friendlyError 识别为「未配置 key」） */
export function aiNotConfiguredResponse(): Response {
  return new Response(
    "AI 服务未配置：请在 .env.local 设置 DEEPSEEK_API_KEY 后重试。",
    { status: 503 },
  );
}
