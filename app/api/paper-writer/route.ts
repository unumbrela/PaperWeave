import { streamChat, aiNotConfiguredResponse } from "@/lib/ai/stream";
import { resolveKeys, hasAnyKey } from "@/lib/ai/keys";
import {
  INTRO_STORYLINE,
  WRITING_PRINCIPLES,
  SIGNPOSTS,
  SECTION_MOVES,
} from "@/lib/paper-writer/methodology";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Hobby 上限 60s（Pro 可放宽到 300）

// 章节词表与 page.tsx 的 SECTIONS 一致；用于把 slug 还原成中文章节名喂给模型。
const SECTION_LABELS: Record<string, string> = {
  abstract: "Abstract（摘要）",
  intro: "Introduction（引言）",
  related: "Related Work（相关工作）",
  method: "Method（方法）",
  experiments: "Experiments（实验）",
  conclusion: "Conclusion（结论）",
};

const Body = z.object({
  topic: z.string().min(2, "请填写论文主题 / 工作标题"),
  innovation: z.string().optional().default(""),
  references: z.string().optional().default(""),
  venueType: z.string().optional().default("会议论文"),
  // 章节范围：选中的章节 slug；只选一个时进入「单节精修」深挖模式。
  sections: z.array(z.string()).optional().default([]),
  audience: z.string().optional().default(""),
  language: z.enum(["zh", "zh-en", "both"]).optional().default("zh-en"),
});

const MAX_REF_CHARS = 14000;

/** 把方法论数据压成紧凑文本注入 prompt（让产出有据可依，而非空谈）。 */
function methodologyBrief(): string {
  const story = INTRO_STORYLINE.map(
    (s) => `  - ${s.stage}：${s.intent}`,
  ).join("\n");
  const principles = WRITING_PRINCIPLES.map(
    (p) => `  - ${p.name}：${p.rule}`,
  ).join("\n");
  const signposts = SIGNPOSTS.map(
    (g) => `  - ${g.relation}（${g.zh}）：${g.en.join(" / ")}`,
  ).join("\n");
  return `【Introduction 四段式故事线（learning_research 论文写作模板）】\n${story}\n\n【英语科技写作原则（《英语科技写作》）】\n${principles}\n\n【过渡 / 连接词（signposting）】\n${signposts}`;
}

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
  const chosen = parsed.sections.filter((s) => s in SECTION_LABELS);
  const sectionNames =
    chosen.length > 0 ? chosen.map((s) => SECTION_LABELS[s]) : Object.values(SECTION_LABELS);
  const deepMode = chosen.length === 1; // 只选一节 → 精修该节
  const wantEn = parsed.language !== "zh";
  const bilingualFull = parsed.language === "both";

  // 该体例下各章节的写作动作 + 审稿关注点（按所选章节过滤）。
  const moveBrief = SECTION_MOVES.filter((m) =>
    chosen.length === 0
      ? true
      : chosen.some((c) => m.section.startsWith(SECTION_LABELS[c].split("（")[0])),
  )
    .map((m) => `- ${m.section}\n  写法：${m.moves.join("；")}\n  审稿关注：${m.reviewerFocus}`)
    .join("\n");

  const langRule = bilingualFull
    ? "每节同时给「中文写作指引」与「完整英文 topic sentence + 连接词模板」两套脚手架。"
    : wantEn
      ? "以中文给写作指引；并在每个段落脚手架后附该段的英文 topic sentence 模板（可留空待填的占位）与建议连接词。"
      : "全部用中文给写作指引，不需要英文句式。";

  // 段落级写作辅助 —— 只搭骨架与表述建议，**不代写连贯正文**（守住「不替你写论文」定位）。
  const system = `你是一位资深论文写作导师，精通《英语科技写作》与 pengsida/learning_research 的论文写作模板。你把研究素材组织成清晰的论文结构，并给出有方法论依据的段落级写作建议。输出 Markdown，使用中文。

**最重要的边界**：你只负责「搭骨架、给建议」，绝不替作者写出可直接粘贴的连贯正文段落。
- 不要输出成段的论文正文、摘要全文或引言全文。
- 每一段给的是：这段的「主题句意图」+「应包含哪些要点」+「与上下段的过渡建议」，以及（按需）英文 topic sentence 模板，而非写好的句子。
- 若忍不住想写完整句子，请改写成「建议在此说明……」「这段应包含……」的指引式表述；英文模板用占位符（如 …、X）留白。

**方法论依据（务必体现在产出里）**：
${methodologyBrief()}

其余要求：
- 结构契合目标体例（会议/期刊/学位论文）的惯例章节。
- Related Work 按主题分组（而非逐篇罗列），指出每组与本工作的关系（继承 / 对比 / 补足 / 区分）。
- 诚实：素材不足处标注「需补充」，不要编造实验数字或不存在的引用。
- 语言：${langRule}`;

  const scopeLine = deepMode
    ? `**写作范围**：单节精修 —— 只针对「${sectionNames[0]}」做深度脚手架（更细的逐段拆解、更多英文模板与病句提醒）。`
    : `**目标章节范围**：${sectionNames.join(" / ")}`;

  const prompt = `请基于以下素材，帮我把论文「组织」起来——产出结构与写作脚手架，不要替我写正文。

**论文主题 / 工作标题**：${parsed.topic}
**核心创新点 / 贡献**：${parsed.innovation || "（未明确提供，请基于主题合理推断并标注假设）"}
**参考论文 / 精读产出 / 已有素材**：${references || "（未提供）"}
**目标体例**：${parsed.venueType}
**目标读者 / 审稿关注**：${parsed.audience || "（未提供，按该体例常见审稿关注处理）"}
${scopeLine}

各章节的写作动作与审稿关注点（请据此组织本节脚手架与自查清单）：
${moveBrief}

请严格按以下结构输出（${deepMode ? "单节精修模式下，第二、三节聚焦该节，其余从简" : "覆盖所选章节"}）：

## 一、一句话故事线 + 贡献
- 用「重要性 → 现有局限 → 我们的洞察+方法 → 结果」串成一句话故事线（指引式，不替我写摘要）。
- 给出 2–4 条「一句话贡献」，平行书写、每条「做了什么 + 带来什么收益」，并与实验一一对应。

## 二、章节大纲
按目标体例给出章节树，每章一句说明该章要达成的目的。

## 三、逐节要点 + 段落脚手架
对每个目标章节：
- **本节要点**：3–6 条 bullet。
- **段落脚手架**：列出建议段落数；每段给「主题句意图 + 应包含要点 + 过渡建议」，不要写出成句正文。${wantEn ? "每段附英文 topic sentence 模板（占位留白）+ 建议连接词。" : ""}
- Introduction 必须遵循四段式故事线。Method 先 overview 后细节、每个设计先讲必要性。

## 四、Related Work 分组
把参考工作按主题分组，每组：组名 + 共同点 + 与本工作的关系。素材不足时标注「需补充该组代表工作」。

## 五、英语科技写作 · 句式与病句提醒
针对所选章节，给 5–8 条可操作的英文写作要点（主题句 / given→new / 平行结构 / 简洁 / hedging），每条配一个「反例→正例」短示例。

## 六、投稿前自查清单
针对该体例与所选章节，列出投稿前应自查的 6–10 条（对应上面的审稿关注点）。`;

  const stream = await streamChat(
    [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    { temperature: 0.4, max_tokens: 5000, deepseekModel: "deepseek-reasoner" },
    keys,
  );

  return new Response(stream, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
