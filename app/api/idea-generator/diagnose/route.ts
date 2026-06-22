/**
 * 创新点工坊 · 阶段一「诊断」
 *
 * 把参考论文 / 研究方向的现状拆成结构化「研究地形图」：现有贡献、承重假设、研究空白。
 * 用非流式 chatCompletion（deepseek-chat，快），服务端解析出干净 JSON 返回，
 * 前端据此渲染可勾选的 假设 / 空白 chips，供阶段二按所选支点 + 透镜发散。
 */

import { chatCompletion } from "@/lib/ai/client";
import { resolveKeys, hasAnyKey } from "@/lib/ai/keys";
import { z } from "zod";
import type { Diagnosis, DiagnosisItem } from "@/lib/idea/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  direction: z.string().min(2, "请填写研究方向或关键词"),
  references: z.string().optional().default(""),
  baseline: z.string().optional().default(""),
  resources: z.string().optional().default(""),
});

const MAX_REF_CHARS = 12000;

/** 从模型输出里捞 JSON（容忍围栏与前后散文）。 */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(candidate);
}

const asString = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function normItems(raw: unknown, prefix: string, withTag: boolean): DiagnosisItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r, i): DiagnosisItem | null => {
      const text = typeof r === "string" ? r.trim() : asString((r as Record<string, unknown>)?.text);
      if (!text) return null;
      const tag = withTag ? asString((r as Record<string, unknown>)?.tag) : "";
      return { id: `${prefix}${i + 1}`, text, ...(tag ? { tag } : {}) };
    })
    .filter((x): x is DiagnosisItem => x !== null);
}

export async function POST(req: Request) {
  const keys = resolveKeys(req);
  if (!hasAnyKey(keys)) {
    return new Response(
      "AI 服务未配置：请在右上角「API Key」填入你自己的 key（DeepSeek / OpenAI / Gemini / OpenRouter 任一）。",
      { status: 503 },
    );
  }

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "请求体格式错误", { status: 400 });
  }

  const references = parsed.references.slice(0, MAX_REF_CHARS);

  const system = `你是一位资深科研导师，擅长把一篇论文 / 一个研究方向的现状，诊断成结构化的「研究地形图」，为后续衍生新 idea 找支点。只输出 JSON，不要任何解释性文字或 Markdown 围栏外的内容。`;

  const prompt = `请对下面的研究现状做诊断，输出一个 JSON 对象，字段如下：
- "grounded": 布尔。参考资料是否充足到能具体分析（不足则基于方向常识，置 false）。
- "contributions": 字符串数组，2–3 条。参考论文/方向「现有的真正贡献」，要具体，不要复述摘要套话。
- "assumptions": 数组，1–3 项，每项 { "text": "..." }。指出 baseline 依赖的「承重假设」——反转它们往往就是创新口。
- "gaps": 数组，2–4 项，每项 { "text": "...", "tag": "短标签如 可控性/效率/保真度/泛化" }。指出局限 / 未解决的研究空白，作为后续攻击目标。

**研究方向 / 关键词**：${parsed.direction}
**参考论文摘要 / 已知工作**：${references || "（未提供，请基于方向常识诊断，grounded 置 false）"}
**要打败的 baseline**：${parsed.baseline || "（未指定）"}
**可用资源**：${parsed.resources || "（未指定）"}

只返回 JSON。`;

  let content: string;
  try {
    content = await chatCompletion(
      [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      { temperature: 0.3, max_tokens: 1500 },
      keys,
    );
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "诊断生成失败", { status: 502 });
  }

  let data: Record<string, unknown>;
  try {
    data = extractJson(content) as Record<string, unknown>;
  } catch {
    return new Response("诊断结果解析失败，请重试。", { status: 502 });
  }

  const diagnosis: Diagnosis = {
    grounded: data.grounded !== false,
    contributions: Array.isArray(data.contributions)
      ? data.contributions.map(asString).filter(Boolean)
      : [],
    assumptions: normItems(data.assumptions, "a", false),
    gaps: normItems(data.gaps, "g", true),
  };

  return Response.json(diagnosis, { headers: { "cache-control": "no-store" } });
}
