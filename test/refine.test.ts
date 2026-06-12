import { describe, it, expect } from 'vitest';
import {
  applyRefine, sortResults, facetCounts, isRefineActive, formatCitations,
  EMPTY_REFINE, type RefineState,
} from '@/lib/paper-search/refine';
import type { PaperResult } from '@/lib/paper-search/types';

// 检索结果的客户端精炼：搜后不重新请求，在已拿到的结果上做二次筛选与重排。

const paper = (over: Partial<PaperResult> = {}): PaperResult => ({
  id: 'p1',
  title: 'A Paper',
  authors: ['A'],
  url: 'https://example.com',
  source: 'arxiv',
  ...over,
});

const corpus: PaperResult[] = [
  paper({ id: 'a', source: 'arxiv', year: 2024, citations: 10, pdfUrl: 'x.pdf' }),
  paper({ id: 'b', source: 'openalex', year: 2023, citations: 500, venue: 'CVPR' }),
  paper({ id: 'c', source: 'openalex', year: 2024, citations: 0, venue: 'CVPR', pdfUrl: 'y.pdf' }),
  paper({ id: 'd', source: 'semantic-scholar', year: 2022, venue: 'NeurIPS' }),
];

describe('applyRefine', () => {
  it('空条件 = 全保留', () => {
    expect(applyRefine(corpus, EMPTY_REFINE)).toHaveLength(4);
  });

  it('按来源 / 年份 / 会议 / PDF / 引用下限组合过滤', () => {
    const r: RefineState = { ...EMPTY_REFINE, sources: ['openalex'] };
    expect(applyRefine(corpus, r).map((p) => p.id)).toEqual(['b', 'c']);

    expect(applyRefine(corpus, { ...EMPTY_REFINE, years: [2024] }).map((p) => p.id)).toEqual(['a', 'c']);
    expect(applyRefine(corpus, { ...EMPTY_REFINE, venues: ['CVPR'] }).map((p) => p.id)).toEqual(['b', 'c']);
    expect(applyRefine(corpus, { ...EMPTY_REFINE, pdfOnly: true }).map((p) => p.id)).toEqual(['a', 'c']);
    expect(applyRefine(corpus, { ...EMPTY_REFINE, minCitations: 100 }).map((p) => p.id)).toEqual(['b']);
  });

  it('缺失字段（无年份/无引用）在对应过滤下被排除', () => {
    // d 无 citations：minCitations>0 时排除
    expect(applyRefine(corpus, { ...EMPTY_REFINE, minCitations: 1 }).map((p) => p.id)).toEqual(['a', 'b']);
  });
});

describe('sortResults', () => {
  it('relevance 保持原始顺序', () => {
    expect(sortResults(corpus, 'relevance').map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('citations 降序，无引用排最后，同值稳定', () => {
    expect(sortResults(corpus, 'citations').map((p) => p.id)).toEqual(['b', 'a', 'c', 'd']);
  });

  it('year 降序，同年保持原始顺序', () => {
    expect(sortResults(corpus, 'year').map((p) => p.id)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('不修改原数组', () => {
    const before = corpus.map((p) => p.id);
    sortResults(corpus, 'citations');
    expect(corpus.map((p) => p.id)).toEqual(before);
  });
});

describe('facetCounts', () => {
  it('来源计数、年份升序、会议按频次降序', () => {
    const f = facetCounts(corpus);
    expect(f.sources).toEqual({ arxiv: 1, openalex: 2, 'semantic-scholar': 1 });
    expect(f.years).toEqual([
      { year: 2022, count: 1 },
      { year: 2023, count: 1 },
      { year: 2024, count: 2 },
    ]);
    expect(f.venues[0]).toEqual({ venue: 'CVPR', count: 2 });
  });
});

describe('isRefineActive', () => {
  it('空条件 false，任一条件 true', () => {
    expect(isRefineActive(EMPTY_REFINE)).toBe(false);
    expect(isRefineActive({ ...EMPTY_REFINE, pdfOnly: true })).toBe(true);
    expect(isRefineActive({ ...EMPTY_REFINE, years: [2024] })).toBe(true);
    expect(isRefineActive({ ...EMPTY_REFINE, minCitations: 10 })).toBe(true);
  });
});

describe('formatCitations', () => {
  it('千位缩写', () => {
    expect(formatCitations(0)).toBe('0');
    expect(formatCitations(999)).toBe('999');
    expect(formatCitations(1000)).toBe('1k');
    expect(formatCitations(1234)).toBe('1.2k');
    expect(formatCitations(12345)).toBe('12k');
  });
});
