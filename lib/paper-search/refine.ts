/**
 * 检索结果的客户端精炼 —— 搜后不重新请求，在已拿到的结果上做
 * 来源 / 年份 / 会议 / PDF / 引用下限的二次筛选与重排序。
 * 纯函数，无副作用，便于单测。
 */

import type { PaperResult } from './types';

export interface RefineState {
  /** 选中的来源 id；空数组 = 不过滤 */
  sources: string[];
  /** 选中的年份；空数组 = 不过滤 */
  years: number[];
  /** 选中的会议/期刊名；空数组 = 不过滤 */
  venues: string[];
  /** 仅保留有 PDF 链接的论文 */
  pdfOnly: boolean;
  /** 引用数下限；0 = 不过滤 */
  minCitations: number;
}

export const EMPTY_REFINE: RefineState = {
  sources: [],
  years: [],
  venues: [],
  pdfOnly: false,
  minCitations: 0,
};

export function isRefineActive(r: RefineState): boolean {
  return (
    r.sources.length > 0 ||
    r.years.length > 0 ||
    r.venues.length > 0 ||
    r.pdfOnly ||
    r.minCitations > 0
  );
}

export function applyRefine(results: PaperResult[], r: RefineState): PaperResult[] {
  return results.filter((p) => {
    if (r.sources.length > 0 && !r.sources.includes(p.source)) return false;
    if (r.years.length > 0 && (!p.year || !r.years.includes(p.year))) return false;
    if (r.venues.length > 0 && (!p.venue || !r.venues.includes(p.venue))) return false;
    if (r.pdfOnly && !p.pdfUrl) return false;
    if (r.minCitations > 0 && (p.citations ?? 0) < r.minCitations) return false;
    return true;
  });
}

export type ClientSort = 'relevance' | 'citations' | 'year';

/** 客户端重排序。relevance 保持服务端原始顺序（稳定）。 */
export function sortResults(results: PaperResult[], by: ClientSort): PaperResult[] {
  if (by === 'relevance') return results;
  const indexed = results.map((p, i) => ({ p, i }));
  indexed.sort((a, b) => {
    if (by === 'citations') {
      const diff = (b.p.citations ?? -1) - (a.p.citations ?? -1);
      if (diff !== 0) return diff;
    } else {
      const diff = (b.p.year ?? 0) - (a.p.year ?? 0);
      if (diff !== 0) return diff;
    }
    return a.i - b.i; // 稳定：同值保持原始顺序
  });
  return indexed.map((x) => x.p);
}

export interface FacetCounts {
  sources: Record<string, number>;
  years: Array<{ year: number; count: number }>;
  venues: Array<{ venue: string; count: number }>;
}

/** 从结果集统计可点选的 facet（来源 / 年份升序 / 会议按频次降序）。 */
export function facetCounts(results: PaperResult[]): FacetCounts {
  const sources: Record<string, number> = {};
  const yearMap = new Map<number, number>();
  const venueMap = new Map<string, number>();

  for (const p of results) {
    sources[p.source] = (sources[p.source] ?? 0) + 1;
    if (p.year) yearMap.set(p.year, (yearMap.get(p.year) ?? 0) + 1);
    if (p.venue) venueMap.set(p.venue, (venueMap.get(p.venue) ?? 0) + 1);
  }

  const years = [...yearMap.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);
  const venues = [...venueMap.entries()]
    .map(([venue, count]) => ({ venue, count }))
    .sort((a, b) => b.count - a.count || a.venue.localeCompare(b.venue));

  return { sources, years, venues };
}

/** 引用数的人类可读缩写：1234 → "1.2k"，平台无关纯函数。 */
export function formatCitations(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}
