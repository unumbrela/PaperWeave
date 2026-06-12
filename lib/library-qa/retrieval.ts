/**
 * RAG 检索层（纯函数，可单测）—— 把论文折叠成可嵌入文档、算余弦相似度、取 top-k。
 * embedding 由服务端 `lib/ai/embeddings.ts` 产出；本模块只做「文档构造 + 向量检索」。
 */

import type { Paper } from "@/lib/db/types";

const MAX_DOC_CHARS = 1600;

/** 把一篇论文折叠成用于 embedding / 检索的文本文档（有界长度）。 */
export function buildDoc(paper: Paper): string {
  const authors = (paper.authors || []).map((a) => a.name).join(", ");
  const parts = [
    paper.title,
    authors && `作者：${authors}`,
    paper.abstract && `摘要：${paper.abstract}`,
    paper.summary && `概述：${paper.summary}`,
    paper.methodology && `方法：${paper.methodology}`,
    paper.contribution && `创新：${paper.contribution}`,
    paper.notes && `笔记：${paper.notes}`,
    paper.tags?.length ? `标签：${paper.tags.join(", ")}` : "",
  ].filter(Boolean);
  return parts.join("\n").slice(0, MAX_DOC_CHARS);
}

/** 稳定的字符串哈希（djb2，浏览器/Node 同源），用于判断文档是否变化、需重嵌。 */
export function textHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  // 转无符号 + 36 进制，短而稳定
  return (h >>> 0).toString(36);
}

/** 余弦相似度。维度不一致或零向量返回 0。 */
export function cosineSim(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export interface ScoredItem<T> {
  item: T;
  score: number;
}

/** 按与 query 向量的余弦相似度，取 top-k。 */
export function topK<T extends { vector: number[] }>(
  query: number[],
  items: T[],
  k: number,
): ScoredItem<T>[] {
  return items
    .map((item) => ({ item, score: cosineSim(query, item.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, k));
}

// ──────────────────────────────────────────────────────────
// 关键词检索降级 —— 无 embedding key 时的零依赖方案（BM25）
//
// DeepSeek 暂无 embedding 接口；只配了 DeepSeek key 的用户走这条路：
// 纯前端、零网络、零费用，质量弱于语义检索但「能用」。
// ──────────────────────────────────────────────────────────

/**
 * 把文本切成检索词元：拉丁词（≥2 字符，含连字符复合词）+ 中文二元组。
 * 中文不依赖分词器——二元组（bigram）是检索界久经考验的零依赖近似。
 */
export function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const tokens: string[] = [];
  for (const m of lower.matchAll(/[a-z0-9]+(?:[-_][a-z0-9]+)*/g)) {
    if (m[0].length >= 2) tokens.push(m[0]);
  }
  const cjkRuns = lower.match(/[㐀-䶿一-鿿]+/g) || [];
  for (const run of cjkRuns) {
    if (run.length === 1) {
      tokens.push(run);
      continue;
    }
    for (let i = 0; i + 1 < run.length; i++) tokens.push(run.slice(i, i + 2));
  }
  return tokens;
}

const BM25_K1 = 1.5;
const BM25_B = 0.75;

/**
 * BM25 关键词检索，取 top-k（仅返回得分 > 0 的项）。
 * 分数按本次结果的最大值归一化到 (0,1]，便于与余弦相似度共用同一展示口径。
 */
export function keywordTopK<T>(
  question: string,
  items: Array<{ item: T; text: string }>,
  k: number,
): ScoredItem<T>[] {
  const qTokens = [...new Set(tokenize(question))];
  if (qTokens.length === 0 || items.length === 0) return [];

  const docs = items.map(({ item, text }) => {
    const tokens = tokenize(text);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    return { item, tf, len: tokens.length };
  });
  const avgLen = docs.reduce((s, d) => s + d.len, 0) / docs.length || 1;

  // 每个查询词元的文档频率 → IDF
  const idf = new Map<string, number>();
  for (const q of qTokens) {
    const df = docs.reduce((n, d) => n + (d.tf.has(q) ? 1 : 0), 0);
    idf.set(q, Math.log(1 + (docs.length - df + 0.5) / (df + 0.5)));
  }

  const scored = docs.map((d) => {
    let score = 0;
    for (const q of qTokens) {
      const f = d.tf.get(q);
      if (!f) continue;
      const norm = f * (BM25_K1 + 1);
      const denom = f + BM25_K1 * (1 - BM25_B + (BM25_B * d.len) / avgLen);
      score += (idf.get(q) || 0) * (norm / denom);
    }
    return { item: d.item, score };
  });

  const ranked = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, k));
  const max = ranked[0]?.score || 1;
  return ranked.map((r) => ({ item: r.item, score: r.score / max }));
}
