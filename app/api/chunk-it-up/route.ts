import { streamText } from "ai";
import { deepseek, MODELS } from "@/lib/ai";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 90;

const Body = z.object({
  task: z.string().min(1).max(8000),
  executor: z.enum(["agent", "small-llm", "human-team"]).default("agent"),
  maxChunks: z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(12)]).default(8),
  domain: z.string().max(80).optional(),
});

const EXECUTOR_RULES = {
  agent: `最终执行者是一个 **Agent**（比如 Claude Code / 带工具的 LLM）：
- 每个 chunk 可以使用工具（读写文件、执行命令、查库、调 API）。
- Runbook 里允许出现 "Read X → Edit Y → Bash Z" 这种工具序列。
- 验收标准要可机器自动校验（有测试 / 有文件输出 / 有日志）。`,
  "small-llm": `最终执行者是一个 **小模型**（例如 Claude Haiku / DeepSeek Chat 不带 reasoning / 7B 级开源）：
- 每个 chunk 必须独立可解，不依赖长上下文与复杂推理。
- 每个 chunk 的单次输出 ≤ 500 tokens 为佳；多了请继续拆。
- 不要出现 "请综合考虑……" 这类开放式问法；每个 chunk 一个明确动作。
- 若中间产物需要传递，必须显式用 JSON / YAML 结构化，供下一 chunk 直接消费。`,
  "human-team": `最终执行者是 **人 + 团队**（比如产品经理、研究员协作）：
- 每个 chunk 要能分配给一个人，写清楚「谁做」「多久」「交付物」。
- 验收是人类可判断的（文档章节、数据表、访谈纪要等）。
- 依赖关系要标出阻塞链，便于排期。`,
} as const;

const EXECUTOR_LABEL = {
  agent: "Agent（带工具的 LLM）",
  "small-llm": "小模型（单次可解，无工具）",
  "human-team": "人 + 团队",
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

  const system = `你是一位"任务拆解器"的大脑。你的工作是把用户给你的一段**复杂任务 / 粗糙 prompt**，改写成一份**原子化、可验收、可被小模型稳定执行**的 Runbook。

理论根基（必须贯彻）：
- Least-to-Most Prompting (Zhou et al., 2022, arXiv:2205.10625)：复杂任务 → 从易到难的子问题序列 → 逐个解。
- Decomposed Prompting (Khot et al., ICLR 2023)：模块化分解，每个 chunk 足够原子，小模型也能承担。
- Divide-and-Conquer for LLMs (2024, arXiv:2402.05359)：分治 > 裸 prompt，尤其对长任务 / 幻觉敏感任务。

核心信念：**只要 chunk 拆得足够细小，小 LLM 也能解决任意复杂任务。** 你要身体力行这一点。

输出硬性要求：
- 全程中文，Markdown。
- 严格按五阶段一级标题输出，顺序不可调换、不可合并、不可省略：
  1. \`## ① Preprocess · 预处理\`
  2. \`## ② Chunk It Up · 原子化拆分\`
  3. \`## ③ Scaffold · 每个 chunk 的脚手架\`
  4. \`## ④ Verify & Post-process · 验收与后处理\`
  5. \`## ⑤ Runbook · 最终可执行提示词包\`
- 禁止说 "以此类推 / 省略 / ......"。每个 chunk 都要写全。
- 禁止凭空给用户没说过的具体数字（比如字数、时限、品牌），只能在模糊点里点出"这里需要用户确认"。
- 最后的 Runbook 必须是一整段独立完整的 Markdown，包在 \`\`\`markdown 代码块里，用户可**直接复制**喂给下游执行者，里面包含全部 chunk、依赖顺序、验收清单。

每阶段的写法规范：

**① Preprocess**：
- 真实目标（去语气、去冗余后的一句话）
- 模糊点清单（具体到字段，每条都说"需要用户确认 X"）
- 隐含假设 / 缺失输入
- 成功长什么样（可验证的终态）

**② Chunk It Up**：
- 先画一张依赖图，用 Markdown 列表表示：\`C1 → C2\`、\`C1, C3 → C4\`。
- 然后逐个列出 C1..Cn，每个 chunk 一行：编号 · 一句话动作 · 估算复杂度（低/中/高）。
- 总数 ≤ \`maxChunks\`。
- 若为"小模型"执行者，任何复杂度"高"的 chunk 必须再拆，直到不再有"高"。

**③ Scaffold**：
- 逐 chunk 写一个小节，每个 chunk 必给：角色 / 输入 / 输出格式（精确到字段或文件名）/ 验收标准。
- 输出格式必须能被下一个 chunk 机器可读地消费（JSON / YAML / 指定文件路径）。

**④ Verify & Post-process**：
- 逐 chunk 一条验收 checklist（"怎么知道这个 chunk 做错了"的**显式信号**）。
- 跨 chunk 一致性检查（字段匹配、数量对齐、语义一致）。
- 合并策略（怎么把各 chunk 输出拼成最终交付物）。
- 失败重试策略（哪一步可重试、哪一步要回滚）。

**⑤ Runbook**：
- 这一节内容**全部**放在一个 \`\`\`markdown 代码块 里。
- 代码块内自成一体：标题 + 总体目标 + 执行顺序 + 每 chunk 的全部 scaffold + 验收 checklist。
- 不要在代码块里再说"见上文 / 同前"。读 Runbook 的人没有上文。`;

  const prompt = `请把下面的复杂任务拆解成一份可执行 Runbook。

**最终执行者**：${EXECUTOR_LABEL[parsed.executor]}

**针对此执行者的拆分规则**：
${EXECUTOR_RULES[parsed.executor]}

**目标 chunk 数上限**：${parsed.maxChunks}（超过就合并相邻原子步骤；少于也 OK，只要每个都是原子的）

${parsed.domain ? `**领域提示**：${parsed.domain}\n\n` : ""}用户的原始任务：

"""
${parsed.task}
"""

现在开始输出五阶段 Markdown。`;

  const result = streamText({
    model: deepseek(MODELS.chat),
    system,
    prompt,
    temperature: 0.3,
  });

  return result.toTextStreamResponse();
}
