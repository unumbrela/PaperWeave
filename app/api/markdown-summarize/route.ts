import { streamChat, aiNotConfiguredResponse } from "@/lib/ai/stream";
import { resolveKeys, hasAnyKey } from "@/lib/ai/keys";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  markdown: z.string().min(40, "论文 Markdown 太短了，至少贴正文片段"),
  focus: z
    .enum(["balanced", "method", "experiment", "related", "innovation"])
    .default("balanced"),
});

const FOCUS_HINT = {
  balanced: "均衡覆盖各部分。",
  method: "重点拆解方法：模块组成、关键公式与设计动机。",
  experiment: "重点拆解实验：数据集、baseline、指标、主要结果与消融。",
  related: "重点梳理 related work 与引文脉络，便于继续追链。",
  innovation:
    "重点放在「创新点画像 / 局限与留白 / 创新设计启发」三节：把每条留白用创新算子充分发散成 5 条可验证的新创新种子，实验细节可从简。",
} as const;

// 八个「创新算子」——把"灵光一现"变成"可枚举的搜索"，引导模型在论文留白上系统化衍生新方向。
const INNOVATION_OPERATORS = `创新算子（用于在「留白」上系统化设计新创新，每条种子须点明用了哪个算子）：
- 替换 Substitute：换目标函数 / 换 backbone / 换模态——把组件 X 换成 Y 会怎样？
- 约束变更 Constrain/Relax：加更强约束，或放松一个默认假设——这个假设去掉/收紧后还成立吗？
- 组合 Combine：把两条独立路线拼起来——A + B 能否互补？
- 迁移 Transfer：把方法搬到另一领域 / 任务——这套机制在别处能复用吗？
- 简化 Simplify/Remove：删掉一个看似必要的组件——去掉它还 work 吗？为什么？
- 反转 Invert：颠倒流程 / 因果 / 优化方向——反过来做会发生什么？
- 尺度变更 Scale：放大 / 缩小数据 / 模型 / 粒度——换个尺度规律是否改变？
- 自动化 Automate：把手工的一步学出来——哪一步是手调的，能否学习化？`;

// 控制输入规模，避免超出上下文
const MAX_CHARS = 16000;

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

  const md = parsed.markdown.slice(0, MAX_CHARS);

  const system = `你是一个严谨的学术论文结构化助手，专长是「读出一篇论文的创新结构，并在其留白上设计可验证的新创新」。输出 Markdown，使用中文。务必：
- 「TL;DR / 研究问题 / 方法概览 / 创新点画像 / 实验设置 / 局限与留白 / 关键引文」七节只从给定原文出发，不编造数据或引用；信息不足的字段写"原文未明确提及"，不要硬凑。
- 「创新点画像」要把每条创新拆成四个槽（类型 / delta / 站在谁肩上 / 代价边界），不要只写一句结论。
- 「创新设计启发」一节允许基于方向常识做合理推断，但每条种子须：① 标明用了哪个创新算子；② 给一句话可证伪的假设；③ 给一句最小验证思路。不得编造"某论文已经做过"的具体实验数字。
- 字段名用加粗，结构清晰，便于下游「创新点立论」直接消费。`;

  const prompt = `请对下面这篇论文 Markdown 做「以创新为脊柱」的结构化精读。
**提取侧重**：${FOCUS_HINT[parsed.focus]}

${INNOVATION_OPERATORS}

输出格式（严格使用以下结构与标题）：

## TL;DR
一句话：这篇在「什么问题」上、用「什么核心做法」、拿到了「什么关键结果」。

## 研究问题与动机
这篇论文要解决什么问题、为什么重要、现有做法卡在哪。

## 方法结构化概览
- **核心思路**：一句话概括方法。
- **模块 / 组件**：逐条列出关键模块及其作用。
- **关键公式或机制**：如有，简述其含义（不必抄全式子）。

## 创新点画像
逐条列出该论文真正的创新（通常 1–3 条），每条严格用四个槽：
- **创新点 N**：一句话。
  - **类型**：从［问题创新 / 方法创新 / 数据创新 / 理论创新 / 应用创新 / 工程创新］选 1–2 个。
  - **改变了什么（delta）**：相对前作，它把哪一步从「A」换成了「B」。
  - **站在谁肩上 + 代价/边界**：依赖的前提、成立的适用范围、为此付出的代价。

## 实验设置
- **数据集**：
- **Baseline / 对比方法**：
- **评测指标**：
- **主要结果**：用数字说话，标明相对 baseline 的提升。

## 局限与留白
- **作者自陈局限**：原文承认的不足。
- **读出的隐含留白**：未覆盖的场景、被默认却未必必要的假设、没回答的问题（这是下一节的原料）。

## 创新设计启发
用上面的「创新算子」对每条留白做系统化发散，给出 3–5 条可验证的新创新种子，每条：
- **种子 N〔算子名〕**：一句话假设——「我假设把 X 换成/加上 Y，能带来 Z，因为 …」。
  - **最小验证思路**：跑什么、看哪个指标能初步证伪（一句话即可，完整实验留给下游立论）。

## 关键引文
- 列出 3–6 条最值得追链的引文（作者/方法名 + 为什么重要）。

---
论文 Markdown 原文：

${md}`;

  const stream = await streamChat(
    [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    { temperature: 0.2, max_tokens: 4500 },
    keys,
  );

  return new Response(stream, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
