import { streamText } from "ai";
import { deepseek, MODELS } from "@/lib/ai";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({
  code: z.string().min(1).max(20000),
  lang: z.string().default("自动检测"),
  granularity: z.enum(["overview", "section", "line"]).default("section"),
  reasoning: z.boolean().default(false),
});

const GRAN_HINT = {
  overview: "先给整体概览，再简要指出最关键的 1-2 段。",
  section: "将代码按逻辑切成几段，对每一段给出用途、输入输出与要点。",
  line: "逐行（或每 1-3 行一组）进行解释，必要时引用原代码。",
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

  const system = `你是一位资深工程师兼教师。你的目标是把一段代码讲透：
- 使用中文。
- 输出 Markdown，结构清晰。
- 诚实：不确定的地方明确说"不确定"或"需要上下文"。
- 不要重复粘贴大段原代码，只在必要时引用短片段。`;

  const prompt = `请解释下面这段代码。

**语言**：${parsed.lang}
**解释粒度**：${parsed.granularity}（${GRAN_HINT[parsed.granularity]}）

请严格按以下结构输出：

## 总体目的
（1-2 句话说这段代码是做什么的。）

## 解释
${GRAN_HINT[parsed.granularity]}

## 复杂度分析
- **时间复杂度**：...
- **空间复杂度**：...
- 如无明显循环/递归，说明"近似 O(1)"。

## 潜在坑位
- 列出可能的 bug、边界情况、可读性或性能问题。若没有明显问题，写"未发现明显问题"。

---
代码：

\`\`\`${parsed.lang === "自动检测" ? "" : parsed.lang.toLowerCase()}
${parsed.code}
\`\`\``;

  const result = streamText({
    model: deepseek(parsed.reasoning ? MODELS.reasoner : MODELS.chat),
    system,
    prompt,
    temperature: 0.2,
  });

  return result.toTextStreamResponse();
}
