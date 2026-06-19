/**
 * 可选增强：对相关性模式的 top-K 结果用一次 LLM 按「与研究目标的契合度」重排。
 *
 * 默认关闭（路由 body.llmRerank=true 才启用），多一次 LLM 调用有成本。
 * 守闸门：无 key / 调用失败 / 解析失败一律**原样返回**，绝不让精排把结果搞没。
 */

import { chatCompletion } from '@/lib/ai/client';
import { hasAnyKey, type ResolvedKeys } from '@/lib/ai/keys';
import type { SearchQuery, PaperResult } from './types';
import { buildKeywordQuery } from './search-service';

/** 仅对前 K 篇做 LLM 精排（K 之后的保持原序），平衡效果与成本/token。 */
export const RERANK_TOP_K = 20;

/** 从 LLM 文本提取编号数组（如 [3,0,1]）。解析不出返回 null。 */
export function extractIndexArray(text: string): number[] | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('[');
  const end = candidate.lastIndexOf(']');
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    if (!Array.isArray(parsed)) return null;
    const out = parsed.filter((x): x is number => typeof x === 'number' && Number.isInteger(x));
    return out.length ? out : null;
  } catch {
    return null;
  }
}

/**
 * 按返回的编号顺序重排前 K 篇；LLM 漏掉的编号按原序补回，K 之后的原样追加。
 * 纯函数，便于单测。
 */
export function applyRerankOrder(
  results: PaperResult[],
  topK: number,
  order: number[],
): PaperResult[] {
  const head = results.slice(0, topK);
  const tail = results.slice(topK);
  const seen = new Set<number>();
  const ranked: PaperResult[] = [];
  for (const idx of order) {
    if (idx >= 0 && idx < head.length && !seen.has(idx)) {
      seen.add(idx);
      ranked.push(head[idx]);
    }
  }
  for (let i = 0; i < head.length; i++) {
    if (!seen.has(i)) ranked.push(head[i]); // LLM 漏判的保持原相关性序
  }
  return [...ranked, ...tail];
}

export async function llmRerankTopK(
  results: PaperResult[],
  query: SearchQuery,
  keys?: ResolvedKeys,
  k: number = RERANK_TOP_K,
): Promise<PaperResult[]> {
  if (!keys || !hasAnyKey(keys)) return results;
  if (results.length < 2) return results;

  const goal =
    [query.researchGoal, query.methodHints].filter(Boolean).join('；') ||
    buildKeywordQuery(query);
  if (!goal) return results;

  const head = results.slice(0, k);
  const list = head
    .map((p, i) => {
      const abs = p.abstract ? p.abstract.slice(0, 200) : '（无摘要）';
      return `${i}. ${p.title}\n   ${abs}`;
    })
    .join('\n');

  const prompt = `研究目标：${goal}

下面是 ${head.length} 篇候选论文（编号 0..${head.length - 1}）：
${list}

请严格按「与研究目标的契合度」从高到低排序，只返回编号的 JSON 数组（包含且仅包含 0..${head.length - 1} 的全排列），如 [3,0,1,...]。不要输出任何其他内容。`;

  try {
    const raw = await chatCompletion(
      [
        { role: 'system', content: '你是学术检索相关性评审，只输出 JSON 数组。' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0, max_tokens: 600 },
      keys,
    );
    const order = extractIndexArray(raw);
    if (!order) return results; // 解析失败：原样返回
    return applyRerankOrder(results, k, order);
  } catch (e) {
    console.warn('[llmRerankTopK] 精排失败，保持原序:', e instanceof Error ? e.message : e);
    return results;
  }
}
