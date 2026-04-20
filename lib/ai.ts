import { createDeepSeek } from "@ai-sdk/deepseek";

export const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export const MODELS = {
  chat: "deepseek-chat",
  reasoner: "deepseek-reasoner",
} as const;
