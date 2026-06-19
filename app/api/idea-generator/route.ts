import { streamChat, aiNotConfiguredResponse } from "@/lib/ai/stream";
import { resolveKeys, hasAnyKey } from "@/lib/ai/keys";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Hobby 上限 60s（Pro 可放宽到 300）

const Body = z.object({
  direction: z.string().min(2, "请填写研究方向或关键词"),
  references: z.string().optional().default(""),
  baseline: z.string().optional().default(""),
  resources: z.string().optional().default(""),
});

const MAX_REF_CHARS = 12000;

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

  const system = `你是一位资深的科研导师，擅长先读懂一篇论文的创新点，再在其之上衍生可落地、可验证的新研究 idea。输出 Markdown，使用中文。务必：
- 先分析参考论文「现有的创新点」与「局限 / 未解决的问题」，作为衍生新 idea 的支点；分析要具体，不要空泛复述摘要。
- 每条新 idea 都要能在给定资源下跑出最小验证实验，拒绝停留在"大方向"空想。
- 差异化假设必须明确指出相对参考论文 / baseline 的不同，不能是换汤不换药。
- 诚实标注风险与失败模式，不夸大可行性。
- 若参考资料不足，基于方向本身的常识合理推断，但不要编造具体论文的实验数字。`;

  const prompt = `请基于以下信息，先分析参考论文的创新点，再生成 3–5 条在其之上拓展改进的候选研究 idea。

**研究方向 / 关键词**：${parsed.direction}
**参考论文摘要 / 已知工作**：${references || "（未提供，请基于方向常识展开）"}
**要打败的 baseline**：${parsed.baseline || "（未指定）"}
**可用资源（GPU / 数据 / 时间）**：${parsed.resources || "（未指定，按常见学术资源假设）"}

先输出一节（参考论文充足时才写，否则注明「未提供参考论文，下列 idea 基于方向常识」）：

## 参考论文的创新点与局限
- **现有创新点**：2–3 条，点明这篇论文真正的贡献在哪。
- **局限 / 可改进处**：1–3 条，作为下面衍生新 idea 的切入口。

随后给出 3–5 条候选 idea，每条严格使用以下结构：

## Idea N：一句话标题

- **问题定义与动机**：要解决的具体问题，以及为什么现在值得做。
- **与 baseline 的差异化假设**：明确"我假设 X 能带来 Y，因为 Z"。
- **最小验证实验**：跑什么数据集 / 设置，看哪个指标，多大规模能初步证伪或证实。
- **预期资源开销**：粗估 GPU/时间，判断是否落在给定资源内。
- **风险点与失败模式**：最可能在哪一步失败，如何提前规避。

最后追加一节：

## 推荐优先级
按"可行性 × 创新性"给出建议先做哪一条，一句话说明理由。`;

  // DeepSeek 走 reasoner 深度推理；fallback 到 OpenAI/Gemini 时降级为各家 chat 模型
  const stream = await streamChat(
    [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    { temperature: 0.5, max_tokens: 4000, deepseekModel: "deepseek-reasoner" },
    keys,
  );

  return new Response(stream, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
