import { NextResponse } from "next/server";
import { z } from "zod";
import { embedTexts, canEmbed } from "@/lib/ai/embeddings";
import { resolveKeys } from "@/lib/ai/keys";
import { enforceRateLimit } from "@/lib/api/http";
import { logEvent, startTimer } from "@/lib/api/log";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  texts: z.array(z.string()).min(1, "texts 不能为空").max(100, "一次最多 100 段文本"),
});

/** 批量把文本向量化。返回 { model, vectors }，前端据 model 保证同向量空间比较。 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "embed", { windowMs: 60_000, max: 30 });
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
    const { texts } = parsed.data;

    const keys = resolveKeys(request);
    if (!canEmbed(keys)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "语义检索需要 OpenAI 或 Gemini 的 API key（DeepSeek 暂无 embedding 接口）。请在右上角「API Key」填入。",
        },
        { status: 503 },
      );
    }

    const { model, vectors } = await embedTexts(
      texts.map((t: unknown) => String(t ?? "")),
      keys,
    );

    logEvent({
      route: "library-qa-embed",
      ok: true,
      ms: done(),
      meta: { provider: model.split(":")[0], count: vectors.length },
    });
    return NextResponse.json({ success: true, model, vectors });
  } catch (error) {
    console.error("[Library QA Embed] Error:", error);
    logEvent({ route: "library-qa-embed", ok: false, ms: done(), status: 500 });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "向量化失败" },
      { status: 500 },
    );
  }
}
