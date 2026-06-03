/**
 * 论文结构化分析 —— `/api/analyze` 与 `/api/analyze-paper` 的共享内核。
 *
 * 两个路由的「对外契约」不同（前者面向论文库、返回解析后的对象 + 可选云写回；
 * 后者面向检索页、返回原始文本），但**输出 schema、系统提示、模型参数、JSON 解析**
 * 完全一致。这里收敛这部分，消除两处长 prompt 与解析逻辑的重复（见 PROJECT-SUMMARY.md §五·C）。
 */

import { chatCompletion } from './client';

export interface PaperAnalysis {
  summary: string;
  methodology: string;
  contribution: string;
  keywords: string[];
  applications: string[];
  limitations: string[];
  confidence: number;
}

/** 严格 JSON 输出规范（两个路由共用）。 */
export const ANALYSIS_OUTPUT_SPEC = `输出字段及格式（必须遵守，仅输出一段合法 JSON，不允许任何额外说明或 markdown）：{
  "keywords": ["..."],            // 3-7 个关键词（数组）
  "summary": "...",             // 1-3 句的论文概述（字符串）
  "methodology": "...",         // 方法/技术概要（字符串）
  "contributions": ["..."],     // 2-3 个主要贡献点（数组）
  "applications": ["..."],      // 研究可应用的领域或场景（数组）
  "limitations": ["..."],       //（可选）已识别的局限或开放问题（数组）
  "confidence": 0.0              // 0-1 的置信度估计（数字）
}
- 如果某字段无法提取，请用空字符串或空数组表示。
- 保持输出语言与输入一致（若输入含中文，请用中文输出）。
- summary 不超过 3 句，keywords 最多 7 个词。`;

const ANALYSIS_SYSTEM = '你是一位严谨的学术研究助手，擅长分析论文并提取关键信息，输出应为机器可解析的 JSON。';

/** 跑一次分析，返回模型原始输出（由调用方决定如何解析/落库）。 */
export async function callAnalysis(userPrompt: string): Promise<string> {
  return chatCompletion(
    [
      { role: 'system', content: ANALYSIS_SYSTEM },
      { role: 'user', content: userPrompt },
    ],
    {
      model: process.env.DEEPSEEK_API_KEY ? 'deepseek-chat' : undefined,
      temperature: 0.2,
      max_tokens: 1000,
    },
  );
}

type RawAnalysis = Partial<Record<keyof PaperAnalysis, unknown>> & {
  contributions?: unknown;
};

/** 从模型输出中稳健解析 JSON（容忍前后包裹的多余文本）。失败返回 null。 */
export function parseAnalysis(raw: string): PaperAnalysis | null {
  let obj: RawAnalysis | null = null;
  try {
    obj = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        obj = JSON.parse(m[0]);
      } catch {
        obj = null;
      }
    }
  }
  if (!obj || typeof obj !== 'object') return null;

  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);

  return {
    summary: str(obj.summary),
    methodology: str(obj.methodology),
    // 兼容 contribution（单数字符串）与 contributions（数组）两种字段名
    contribution: str(obj.contribution) || arr(obj.contributions).join('；'),
    keywords: arr(obj.keywords),
    applications: arr(obj.applications),
    limitations: arr(obj.limitations),
    confidence: typeof obj.confidence === 'number' ? obj.confidence : 0,
  };
}

/** 把解析结果映射为论文库字段（summary / methodology / contribution / notes）。 */
export function toPaperFields(a: PaperAnalysis) {
  return {
    summary: a.summary,
    methodology: a.methodology,
    contribution: a.contribution,
    notes: `关键词：${a.keywords.join(', ')}；应用：${a.applications.join(', ')}`,
  };
}
