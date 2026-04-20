import { streamText } from "ai";
import { deepseek, MODELS } from "@/lib/ai";
import { extractFromUrl } from "@/lib/extract";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  url: z.string().url("URL 看起来不太对"),
  length: z.enum(["short", "medium", "long"]).default("medium"),
});

const LENGTH_HINT = {
  short: "约 150 字",
  medium: "约 300 字",
  long: "约 600 字",
} as const;

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return new Response(
      e instanceof Error ? e.message : "请求体格式错误",
      { status: 400 },
    );
  }

  let page;
  try {
    page = await extractFromUrl(parsed.url);
  } catch (e) {
    return new Response(
      e instanceof Error ? e.message : "抓取失败",
      { status: 400 },
    );
  }

  const system = `你是一个精炼的摘要助手。输出 Markdown。务必：
- 使用中文。
- 从原文事实出发，不编造。
- 结构要清晰，字段名用加粗。`;

  const prompt = `请对下面这篇网页进行摘要。

**标题**：${page.title}
**来源**：${page.url}
**期望长度**：${LENGTH_HINT[parsed.length]}

输出格式（严格使用以下结构）：

## TL;DR
（一句话，不超过 60 字。）

## 关键点
- 3 到 5 条要点。每条一行，尽量具体。

## 值得引用的原句
> 2 到 3 条最有信息量的原文引述，保留原文语言。

## 可能的反方观点
（简要列出潜在反对或被忽视的角度；如果原文立场中立，写"原文立场中立，无明显争议"。）

---
原文正文：

${page.text}`;

  const result = streamText({
    model: deepseek(MODELS.chat),
    system,
    prompt,
    temperature: 0.3,
  });

  return result.toTextStreamResponse();
}
