import { streamText } from "ai";
import { getDeepSeek, MODELS, aiNotConfiguredResponse } from "@/lib/ai";
import { resolveKeys } from "@/lib/ai/keys";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  markdown: z.string().min(40, "论文 Markdown 太短了，至少贴正文片段"),
  focus: z.enum(["balanced", "method", "experiment", "related"]).default("balanced"),
});

const FOCUS_HINT = {
  balanced: "均衡覆盖各部分。",
  method: "重点拆解方法：模块组成、创新点、关键公式与设计动机。",
  experiment: "重点拆解实验：数据集、baseline、指标、主要结果与消融。",
  related: "重点梳理 related work 与引文脉络，便于继续追链。",
} as const;

// 控制输入规模，避免超出上下文
const MAX_CHARS = 16000;

export async function POST(req: Request) {
  const { deepseek: dsKey } = resolveKeys(req);
  if (!dsKey) return aiNotConfiguredResponse();
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "请求体格式错误", {
      status: 400,
    });
  }

  const md = parsed.markdown.slice(0, MAX_CHARS);

  const system = `你是一个严谨的学术论文结构化助手。输出 Markdown，使用中文。务必：
- 只从给定原文出发，不编造数据或引用。
- 信息不足的字段写"原文未明确提及"，不要硬凑。
- 字段名用加粗，结构清晰，便于下游 Idea 生成器直接消费。`;

  const prompt = `请对下面这篇论文 Markdown 做结构化总结。
**提取侧重**：${FOCUS_HINT[parsed.focus]}

输出格式（严格使用以下结构）：

## 研究问题与动机
（这篇论文要解决什么问题，为什么重要。）

## 方法结构化概览
- **核心思路**：一句话概括方法。
- **模块 / 组件**：逐条列出关键模块及其作用。
- **创新点**：相对已有工作的真正差异。
- **关键公式或机制**：如有，简述其含义（不必抄全式子）。

## 实验设置
- **数据集**：
- **Baseline / 对比方法**：
- **评测指标**：
- **主要结果**：用数字说话，标明相对 baseline 的提升。

## 关键引文
- 列出 3–6 条最值得追链的引文（作者/方法名 + 为什么重要）。

---
论文 Markdown 原文：

${md}`;

  const result = streamText({
    model: getDeepSeek(dsKey)(MODELS.chat),
    system,
    prompt,
    temperature: 0.2,
  });

  return result.toTextStreamResponse();
}
