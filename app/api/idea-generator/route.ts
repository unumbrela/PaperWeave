/**
 * 创新点工坊 · 阶段二「设计」
 *
 * 在阶段一诊断出的支点（用户勾选的 假设 / 空白）之上，按用户选定的「创新透镜」
 * 跑 propose→critique→refine：先按透镜发散候选，再以挑剔评审视角自我批判
 * （新颖性是否已被做过、可行性是否撑得起），最后精炼并给 创新性/可行性 评分。
 * 流式输出：先一段人读的分析，末尾附一个 ```json 代码块（ideas + priority），
 * 由前端 parseIdeaSet 解析成卡片 + 象限图（解析失败回退 Markdown）。
 */

import { streamChat, aiNotConfiguredResponse } from "@/lib/ai/stream";
import { resolveKeys, hasAnyKey } from "@/lib/ai/keys";
import { LENSES } from "@/lib/idea/lenses";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Hobby 上限 60s（Pro 可放宽到 300）

const Body = z.object({
  direction: z.string().min(2, "请填写研究方向或关键词"),
  references: z.string().optional().default(""),
  baseline: z.string().optional().default(""),
  resources: z.string().optional().default(""),
  /** 阶段一勾选的支点文本（假设 / 空白），逐条带过来作攻击目标。 */
  selectedGaps: z.array(z.string()).optional().default([]),
  /** 阶段二勾选的透镜 id（对应 lib/idea/lenses.ts）。 */
  selectedLenses: z.array(z.string()).optional().default([]),
});

const MAX_REF_CHARS = 12000;

export async function POST(req: Request) {
  const keys = resolveKeys(req);
  if (!hasAnyKey(keys)) return aiNotConfiguredResponse();
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "请求体格式错误", { status: 400 });
  }

  const references = parsed.references.slice(0, MAX_REF_CHARS);

  // 把所选透镜的策略指令拼进 prompt；未选则让模型自选最合适的策略
  const lenses = LENSES.filter((l) => parsed.selectedLenses.includes(l.id));
  const lensBlock = lenses.length
    ? lenses.map((l) => `- 【${l.name}】${l.promptHint}`).join("\n")
    : "（用户未指定透镜，请自行从 类比迁移 / 假设反转 / 约束松弛 / 跨域引入 / 机制替换 / 组合拼接 / 尺度变换 / 降本增效 中各取所需。）";

  const gapBlock = parsed.selectedGaps.length
    ? parsed.selectedGaps.map((g, i) => `${i + 1}. ${g}`).join("\n")
    : "（用户未勾选具体支点，请自行识别最值得攻击的局限。）";

  const system = `你是一位资深科研导师，同时扮演两个角色：先以「提出者」按指定的创新策略发散候选 idea，再以「挑剔评审」自我批判每条 idea（新颖性是否已被前人做过？可行性是否撑得起给定资源？），然后精炼。务必：
- 每条 idea 都要能在给定资源下跑出最小验证实验，拒绝停留在大方向空想。
- 差异化假设必须明确指出相对 baseline 的不同，不能换汤不换药。
- 经过自我批判后给出 创新性(novelty) 与 可行性(feasibility) 1–5 的诚实评分，不为了好看而虚高。
- 不编造具体论文的实验数字。`;

  const prompt = `请在下面这些支点之上，按指定的创新透镜，经 提出→自我批判→精炼 给出 3–5 条候选研究 idea。

**研究方向 / 关键词**：${parsed.direction}
**参考论文摘要 / 已知工作**：${references || "（未提供，请基于方向常识展开）"}
**要打败的 baseline**：${parsed.baseline || "（未指定）"}
**可用资源（GPU / 数据 / 时间）**：${parsed.resources || "（未指定，按常见学术资源假设）"}

**要攻击的支点（用户勾选的局限 / 假设）**：
${gapBlock}

**采用的创新透镜（每条 idea 标注它主要由哪个透镜驱动）**：
${lensBlock}

先用 2–4 句话简述你的发散与筛选思路（人读，纯文本）。

然后**在最后输出一个 \`\`\`json 代码块**，且只在代码块里放结构化结果，格式如下（字段务必齐全）：

\`\`\`json
{
  "ideas": [
    {
      "title": "一句话标题",
      "motivation": "问题定义与动机：要解决的具体问题，以及为何现在值得做",
      "hypothesis": "与 baseline 的差异化假设：我假设 X 能带来 Y，因为 Z",
      "experiment": "最小验证实验：跑什么数据/设置，看哪个指标，多大规模能初步证伪或证实",
      "resources": "预期资源开销：粗估 GPU/时间，是否落在给定资源内",
      "risk": "最可能在哪一步失败，如何提前规避",
      "novelty": 4,
      "feasibility": 5,
      "lens": "机制替换"
    }
  ],
  "priority": "推荐先做哪一条 + 一句话理由（按 可行性×创新性 权衡）"
}
\`\`\``;

  // DeepSeek 走 reasoner 深度推理；fallback 到 OpenAI/Gemini 时降级为各家 chat 模型
  const stream = await streamChat(
    [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    { temperature: 0.6, max_tokens: 4000, deepseekModel: "deepseek-reasoner" },
    keys,
  );

  return new Response(stream, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
