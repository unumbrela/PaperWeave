/**
 * ZenMux 接入常量 —— baseURL 与（可选）应用归属请求头。
 *
 * ZenMux 是 OpenAI 兼容的统一网关：一个 key 即可路由 Anthropic / OpenAI / Google /
 * DeepSeek / Qwen 等多家模型（按用量计费）。与 OpenRouter 不同，闭源模型无需在后台
 * 额外开启「数据策略」即可直接路由，调用只需带 API Key。
 *
 * `HTTP-Referer` / `X-Title` 为可选的应用归属信息（供 ZenMux 后台标识来源），
 * 非鉴权必需。两处调用（client.ts 非流式 / stream.ts 流式）共用本文件，行为一致。
 */

export const ZENMUX_URL = process.env.ZENMUX_API_URL || "https://zenmux.ai/api/v1";

/** OpenAI SDK 的 defaultHeaders（应用归属，可选）。 */
export const ZENMUX_HEADERS: Record<string, string> = {
  "HTTP-Referer": process.env.ZENMUX_SITE_URL || "https://www.z1ha0.com",
  "X-Title": process.env.ZENMUX_SITE_NAME || "PaperWeave",
};
