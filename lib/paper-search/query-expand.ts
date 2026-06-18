/**
 * 查询扩展层（Perplexity 式 fan-out 的第一步）——
 * 把用户的自然语言研究目标拆成多条「多样化子查询」，
 * 再由 search-service 对每条子查询跨源 fan-out、合并去重、重排。
 *
 * 设计原则（守住「默认配置可达」闸门）：
 * - 有 AI key 时用 LLM 扩展，提升召回（同义词 / 子方向 / 方法名 / 中英双语术语）；
 * - 无 key 或调用失败一律**优雅降级**为单条原始查询，检索照常零 key 可用。
 */

import { chatCompletion } from '@/lib/ai/client';
import { hasAnyKey, type ResolvedKeys } from '@/lib/ai/keys';
import type { SearchQuery } from './types';
import { buildKeywordQuery } from './search-service';

/** 单次扩展产出的最大子查询数（含原始查询；防 fan-out 放大上游与延迟）。 */
export const MAX_SUBQUERIES = 5;

/** 从 LLM 文本中提取字符串数组，容忍 ```json 围栏与前后杂文。解析不出返回 null。 */
export function extractStringArray(text: string): string[] | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('[');
  const end = candidate.lastIndexOf(']');
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    if (Array.isArray(parsed)) {
      const out = parsed
        .filter((x): x is string => typeof x === 'string')
        .map((s) => s.trim())
        .filter(Boolean);
      return out.length ? out : null;
    }
  } catch {
    // 解析失败走 null，调用方降级
  }
  return null;
}

/** 归一化去重（忽略大小写与空白），保序。 */
function dedupeQueries(queries: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of queries) {
    const key = q.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(q.trim());
  }
  return out;
}

/**
 * 扩展查询：返回 1–MAX_SUBQUERIES 条子查询，**首条始终是原始关键词查询**
 * （保证扩展失败也至少有它，且原始意图不被稀释）。
 */
export async function expandQuery(
  query: SearchQuery,
  keys?: ResolvedKeys,
): Promise<string[]> {
  const base = buildKeywordQuery(query);
  // 没有基础查询词则无从扩展
  if (!base) return [];
  // 无 AI key：直接降级单查询（零 key 可用）
  if (!keys || !hasAnyKey(keys)) return [base];

  const intent = [query.researchGoal, query.methodHints].filter(Boolean).join('；');
  const prompt = `我要在学术数据库（OpenAlex / arXiv / Semantic Scholar / Crossref）里检索论文，目标是「不重不漏」地覆盖一个研究主题。

主关键词：${base}
${intent ? `研究意图：${intent}` : ''}

请生成 ${MAX_SUBQUERIES - 1} 条**多样化的英文检索查询**，覆盖该主题的不同侧面：同义词 / 近义术语、子方向、典型方法或模型名、常见数据集或任务名。每条应是可直接喂给学术搜索引擎的短查询（2-6 个词），彼此尽量不重叠，且都紧扣主题（不要偏题扩散）。

只返回一个 JSON 字符串数组，不要任何其他文字。例如：["query one", "query two"]`;

  try {
    const raw = await chatCompletion(
      [
        {
          role: 'system',
          content:
            '你是学术检索专家，擅长把一个研究主题展开成互补的多条检索式以最大化召回。只输出 JSON 数组。',
        },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.4, max_tokens: 400 },
      keys,
    );
    const extra = extractStringArray(raw) ?? [];
    return dedupeQueries([base, ...extra]).slice(0, MAX_SUBQUERIES);
  } catch (e) {
    console.warn('[expandQuery] 扩展失败，降级单查询:', e instanceof Error ? e.message : e);
    return [base];
  }
}
