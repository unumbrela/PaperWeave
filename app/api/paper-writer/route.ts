import { streamChat, aiNotConfiguredResponse } from "@/lib/ai/stream";
import { resolveKeys, hasAnyKey } from "@/lib/ai/keys";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Hobby 上限 60s（Pro 可放宽到 300）

const Body = z.object({
  topic: z.string().min(2, "请填写论文主题 / 工作标题"),
  innovation: z.string().optional().default(""),
  references: z.string().optional().default(""),
  venueType: z.string().optional().default("会议论文"),
});

const MAX_REF_CHARS = 14000;

export async function POST(req: Request) {
  const keys = resolveKeys(req);
  if (!hasAnyKey(keys)) return aiNotConfiguredResponse();
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "请求体格式错误", {
      status: 400,
    });
  }

  const references = parsed.references.slice(0, MAX_REF_CHARS);

  // 段落级写作辅助 —— 只搭骨架与表述建议，**不代写连贯正文**（守住「不替你写论文」定位）。
  const system = `你是一位资深论文写作导师，擅长把研究素材组织成清晰的论文结构。输出 Markdown，使用中文。

**最重要的边界**：你只负责「搭骨架、给建议」，绝不替作者写出可直接粘贴的连贯正文段落。
- 不要输出成段的论文正文、摘要全文或引言全文。
- 每一节给的是：这节要表达的要点（bullet）、每段的「主题句意图」+「应包含哪些要点」+「与上下段的过渡建议」，而非写好的句子。
- 若忍不住想写完整句子，请改写成「建议在此说明……」「这段应包含……」的指引式表述。

其余要求：
- 结构契合目标体例（会议/期刊/学位论文）的惯例章节。
- Related Work 按主题分组（而非逐篇罗列），指出每组与本工作的关系。
- 诚实：素材不足处标注「需补充」，不要编造实验数字或不存在的引用。`;

  const prompt = `请基于以下素材，帮我把论文「组织」起来——产出结构与写作脚手架，不要替我写正文。

**论文主题 / 工作标题**：${parsed.topic}
**核心创新点 / 贡献**：${parsed.innovation || "（未明确提供，请基于主题合理推断并标注假设）"}
**参考论文 / 精读产出 / 已有素材**：${references || "（未提供）"}
**目标体例**：${parsed.venueType}

请严格按以下结构输出：

## 一、论文定位与一句话卖点
- 用一句话点明这篇论文相对已有工作的核心增量（指引式，不替我写摘要）。
- 列出 2–4 条「读者读完应记住的关键信息」。

## 二、章节大纲
按目标体例给出章节树（如 Introduction / Related Work / Method / Experiments / Conclusion），每章一句说明该章要达成的目的。

## 三、逐节要点 + 段落脚手架
对每个主要章节：
- **本节要点**：3–6 条 bullet，说明本节必须覆盖什么。
- **段落脚手架**：列出本节建议的段落数，每段给出「主题句意图 + 应包含要点 + 过渡建议」，不要写出成句正文。

## 四、Related Work 分组
把参考工作按主题分成若干组，每组：组名 + 该组共同点 + 与本工作的关系（继承/对比/补足）。素材不足时标注「需补充该组代表工作」。

## 五、写作检查清单
针对该体例的常见审稿关注点，列出投稿前应自查的 6–10 条。`;

  const stream = await streamChat(
    [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    { temperature: 0.4, max_tokens: 4000, deepseekModel: "deepseek-reasoner" },
    keys,
  );

  return new Response(stream, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
