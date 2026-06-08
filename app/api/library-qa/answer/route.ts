import { NextResponse } from "next/server";
import { z } from "zod";
import { streamChat } from "@/lib/ai/stream";
import { resolveKeys, hasAnyKey } from "@/lib/ai/keys";
import { enforceRateLimit } from "@/lib/api/http";
import { logEvent, startTimer } from "@/lib/api/log";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  question: z.string().trim().min(1, "请输入问题"),
  contexts: z
    .array(z.object({ n: z.number(), title: z.string(), text: z.string() }))
    .min(1, "没有可用的论文上下文"),
});

/** 基于检索到的论文片段，生成带 [n] 引用的归纳回答。 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "qa-answer", { windowMs: 60_000, max: 20 });
  if (limited) return limited;

  const done = startTimer();
  try {
    const parsed = Body.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "请求体格式错误" },
        { status: 400 },
      );
    }
    const { question, contexts } = parsed.data;

    const keys = resolveKeys(request);
    if (!hasAnyKey(keys)) {
      return NextResponse.json(
        { success: false, error: "AI 服务未配置：请在右上角「API Key」填入你自己的 key" },
        { status: 503 },
      );
    }

    const contextBlock = contexts
      .map((c) => `[${c.n}] ${c.title}\n${c.text}`)
      .join("\n\n");

    const system =
      "你是基于用户私人论文库的研究问答助手。只能依据给定的论文片段回答，" +
      "凡引用某篇论文，必须在句末用 [编号] 标注来源（编号即片段前的方括号数字）。" +
      "若给定片段不足以回答，明确说明「论文库中没有足够信息」，不要编造。使用中文，输出 Markdown。";

    const prompt = `问题：${question}

可用论文片段（每段前的 [n] 是其编号）：

${contextBlock}

请基于上述片段回答问题，并在引用处标注 [n]。`;

    const stream = await streamChat(
      [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      { temperature: 0.2, max_tokens: 1200 },
      keys,
      ({ provider }) =>
        logEvent({ route: "library-qa-answer", ok: true, ms: done(), meta: { provider, contexts: contexts.length } }),
    );

    return new Response(stream, {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  } catch (error) {
    console.error("[Library QA Answer] Error:", error);
    logEvent({ route: "library-qa-answer", ok: false, ms: done(), status: 500 });
    return new Response(error instanceof Error ? error.message : "回答生成失败", { status: 500 });
  }
}
