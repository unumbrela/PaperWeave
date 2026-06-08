import { describe, it, expect } from 'vitest';
import { cacheKey, queryLabel } from '@/lib/paper-search/cache';
import type { SearchQuery } from '@/lib/paper-search/types';

describe('cacheKey', () => {
  const base: SearchQuery = {
    field: 'computer-vision',
    keywords: 'diffusion models',
    startYear: 2022,
    endYear: 2024,
    venues: ['CVPR', 'ICLR'],
    sortBy: 'relevance',
    maxResults: 30,
  };

  it('对同一查询稳定（同输入同键）', () => {
    expect(cacheKey(base, ['openalex', 'arxiv'])).toBe(
      cacheKey({ ...base }, ['openalex', 'arxiv']),
    );
  });

  it('maxResults 不进 key（不同条数仍命中同缓存）', () => {
    const a = cacheKey({ ...base, maxResults: 10 }, ['openalex']);
    const b = cacheKey({ ...base, maxResults: 50 }, ['openalex']);
    expect(a).toBe(b);
  });

  it('关键词大小写/空白归一化（语义相同同键）', () => {
    const a = cacheKey({ ...base, keywords: 'Diffusion   Models' }, ['arxiv']);
    const b = cacheKey({ ...base, keywords: 'diffusion models' }, ['arxiv']);
    expect(a).toBe(b);
  });

  it('source 顺序无关（集合语义）', () => {
    expect(cacheKey(base, ['openalex', 'arxiv'])).toBe(
      cacheKey(base, ['arxiv', 'openalex']),
    );
  });

  it('venues 顺序无关', () => {
    const a = cacheKey({ ...base, venues: ['CVPR', 'ICLR'] }, ['openalex']);
    const b = cacheKey({ ...base, venues: ['ICLR', 'CVPR'] }, ['openalex']);
    expect(a).toBe(b);
  });

  it('关键词不同则键不同', () => {
    const a = cacheKey({ ...base, keywords: 'mamba' }, ['openalex']);
    const b = cacheKey({ ...base, keywords: 'transformer' }, ['openalex']);
    expect(a).not.toBe(b);
  });

  it('检索源不同则键不同', () => {
    expect(cacheKey(base, ['openalex'])).not.toBe(cacheKey(base, ['arxiv']));
  });

  it('年份范围不同则键不同', () => {
    const a = cacheKey({ ...base, startYear: 2020 }, ['openalex']);
    const b = cacheKey({ ...base, startYear: 2023 }, ['openalex']);
    expect(a).not.toBe(b);
  });

  it('输出为 64 位十六进制（sha256）', () => {
    expect(cacheKey(base, ['openalex'])).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('queryLabel', () => {
  it('优先关键词，组合领域', () => {
    expect(queryLabel({ keywords: 'mamba', field: 'computer-vision' })).toBe(
      'mamba · computer-vision',
    );
  });

  it('空查询有兜底', () => {
    expect(queryLabel({})).toBe('(空查询)');
  });

  it('截断超长 label', () => {
    const long = 'x'.repeat(200);
    expect(queryLabel({ keywords: long }).length).toBeLessThanOrEqual(120);
  });
});
