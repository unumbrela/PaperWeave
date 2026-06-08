import { NextResponse } from "next/server";
import { z } from "zod";
import { streamChat } from "@/lib/ai/stream";
import { resolveKeys, hasAnyKey } from "@/lib/ai/keys";
import { buildComparePrompt } from "@/lib/compare/prompt";
import { enforceRateLimit } from "@/lib/api/http";
import { logEvent, startTimer } from "@/lib/api/log";
import type { Paper } from "@/lib/db/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  papers: z
    .array(z.object({ title: z.string() }).passthrough())
    .min(2, "请至少选择 2 篇论文进行对比")
    .max(6, "一次最多对比 6 篇（避免上下文过长）"),
});

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "compare", { windowMs: 60_000, max: 12 });
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
    const papers = parsed.data.papers as unknown as Paper[];

    const keys = resolveKeys(request);
    if (!hasAnyKey(keys)) {
      return NextResponse.json(
        { success: false, error: "AI 服务未配置：请在右上角「API Key」填入你自己的 key" },
        { status: 503 },
      );
    }

    const prompt = buildComparePrompt(papers);
    const stream = await streamChat(
      [
        { role: "system", content: "你是严谨的学术综述助手，输出规范的 Markdown。" },
        { role: "user", content: prompt },
      ],
      { temperature: 0.3, max_tokens: 2000 },
      keys,
      ({ provider }) => logEvent({ route: "compare-papers", ok: true, ms: done(), meta: { provider, papers: papers.length } }),
    );

    return new Response(stream, {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  } catch (error) {
    console.error("[Compare Papers API] Error:", error);
    logEvent({ route: "compare-papers", ok: false, ms: done(), status: 500 });
    return new Response(error instanceof Error ? error.message : "对比生成失败", { status: 500 });
  }
}
