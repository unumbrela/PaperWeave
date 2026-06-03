import { streamText } from "ai";
import { deepseek, MODELS } from "@/lib/ai";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({
  direction: z.string().min(2, "请填写研究方向或关键词"),
  references: z.string().optional().default(""),
  baseline: z.string().optional().default(""),
  resources: z.string().optional().default(""),
});

const MAX_REF_CHARS = 12000;

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "请求体格式错误", {
      status: 400,
    });
  }

  const references = parsed.references.slice(0, MAX_REF_CHARS);

  const system = `你是一位资深的科研导师，擅长把模糊的方向收敛成可落地、可验证的研究 idea。输出 Markdown，使用中文。务必：
- 每条 idea 都要能在给定资源下跑出最小验证实验，拒绝停留在"大方向"空想。
- 差异化假设必须明确指出相对 baseline 的不同，不能是换汤不换药。
- 诚实标注风险与失败模式，不夸大可行性。
- 若参考资料不足，基于方向本身的常识合理推断，但不要编造具体论文的实验数字。`;

  const prompt = `请基于以下信息，生成 3–5 条候选研究 idea。

**研究方向 / 关键词**：${parsed.direction}
**参考论文摘要 / 已知工作**：${references || "（未提供，请基于方向常识展开）"}
**要打败的 baseline**：${parsed.baseline || "（未指定）"}
**可用资源（GPU / 数据 / 时间）**：${parsed.resources || "（未指定，按常见学术资源假设）"}

每条 idea 严格使用以下结构：

## Idea N：一句话标题

- **问题定义与动机**：要解决的具体问题，以及为什么现在值得做。
- **与 baseline 的差异化假设**：明确"我假设 X 能带来 Y，因为 Z"。
- **最小验证实验**：跑什么数据集 / 设置，看哪个指标，多大规模能初步证伪或证实。
- **预期资源开销**：粗估 GPU/时间，判断是否落在给定资源内。
- **风险点与失败模式**：最可能在哪一步失败，如何提前规避。

最后追加一节：

## 推荐优先级
按"可行性 × 创新性"给出建议先做哪一条，一句话说明理由。`;

  const result = streamText({
    model: deepseek(MODELS.reasoner),
    system,
    prompt,
    temperature: 0.5,
  });

  return result.toTextStreamResponse();
}
