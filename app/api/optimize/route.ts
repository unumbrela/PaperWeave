import { streamText } from "ai";
import { deepseek, MODELS } from "@/lib/ai";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  prompt: z.string().min(1).max(8000),
  target: z.enum(["chat", "code", "image"]).default("chat"),
});

const TARGET_RULES = {
  chat: `- 明确目标与输出格式（列表 / 段落 / JSON / 表格）。
- 给模型一个角色（例如"你是资深产品经理"）。
- 如果任务复杂，拆成分步骤。
- 提供 1-2 个高质量示例（few-shot）时效果最好。
- 明确边界：长度、风格、禁止项。`,
  code: `- 先说清楚：语言、框架版本、目标行为。
- 附上最小可复现输入输出或测试用例。
- 要求输出遵守的结构（只给代码 / 加注释 / 附解释）。
- 指出需要考虑的边界条件和错误处理。
- 禁止项：不要编造 API、不要 "...（省略）"。`,
  image: `- 明确主体：是什么（人 / 物 / 场景）。
- 明确镜头与构图：视角、景别、焦段。
- 明确风格：摄影 / 插画 / 3D / 某位艺术家风格。
- 明确光线与色彩：暖光 / 冷光 / 色板。
- 明确分辨率、长宽比、细节程度（8k, highly detailed）。
- 适当加入反向提示（negative prompt）。`,
} as const;

const TARGET_LABEL = {
  chat: "对话模型",
  code: "代码模型",
  image: "图像模型",
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

  const system = `你是一位 prompt 工程师。用户会给你一段粗糙的 prompt，你要：
- 用中文回答，输出 Markdown。
- 保留用户原意，只补齐结构、边界、格式，不偷换任务。
- 不要凭空添加用户没说过的事实性约束（比如具体字数要求、具体品牌），只补"结构性"约束。
- 最后提供的"优化版 Prompt"应该可以原样复制粘贴给目标模型使用。`;

  const prompt = `请优化下面的 prompt。

**目标模型类型**：${TARGET_LABEL[parsed.target]}

**针对此类型，推荐的优化方向**：
${TARGET_RULES[parsed.target]}

请严格按以下结构输出：

## 诊断
（用 2-4 条 bullet 指出原 prompt 存在的问题：模糊？缺角色？缺格式？）

## 优化版 Prompt
\`\`\`
（放在代码块里，便于直接复制）
\`\`\`

## 关键改动
（用表格对比"原文片段 → 改后片段 → 理由"，4-6 行即可。）

---
用户的原始 Prompt：

"""
${parsed.prompt}
"""`;

  const result = streamText({
    model: deepseek(MODELS.chat),
    system,
    prompt,
    temperature: 0.4,
  });

  return result.toTextStreamResponse();
}
