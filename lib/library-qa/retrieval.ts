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
