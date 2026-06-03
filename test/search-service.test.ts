import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildKeywordQuery,
  shouldKeepPaper,
  restoreOpenAlexAbstract,
  searchPapers,
} from '@/lib/paper-search/search-service';
import type { PaperResult } from '@/lib/paper-search/types';

function paper(overrides: Partial<PaperResult> = {}): PaperResult {
  return {
    id: 'x',
    title: 'A study of transformers',
    authors: ['Alice'],
    url: 'https://example.com',
    abstract: 'attention mechanism for vision',
    source: 'arxiv',
    ...overrides,
  };
}

describe('buildKeywordQuery', () => {
  it('拼接关键词 + 领域 + 目标并压缩空白', () => {
    const q = buildKeywordQuery({
      keywords: 'mamba',
      field: 'medical-imaging',
      researchGoal: 'segmentation',
    });
    expect(q).toBe('mamba medical image segmentation segmentation');
  });

  it('忽略空字段', () => {
    expect(buildKeywordQuery({ keywords: 'nlp' })).toBe('nlp');
    expect(buildKeywordQuery({})).toBe('');
  });
});

describe('shouldKeepPaper', () => {
  it('mustHave 全部命中才保留', () => {
    expect(shouldKeepPaper(paper(), { mustHaveKeywords: 'transformers, attention' })).toBe(true);
    expect(shouldKeepPaper(paper(), { mustHaveKeywords: 'transformers, diffusion' })).toBe(false);
  });

  it('命中 exclude 即剔除', () => {
    expect(shouldKeepPaper(paper(), { excludeKeywords: 'vision' })).toBe(false);
    expect(shouldKeepPaper(paper(), { excludeKeywords: 'genome' })).toBe(true);
  });

  it('支持中文逗号/分号分隔', () => {
    expect(shouldKeepPaper(paper(), { mustHaveKeywords: 'transformers；attention' })).toBe(true);
  });
});

describe('restoreOpenAlexAbstract', () => {
  it('按倒排索引位置还原摘要', () => {
    const idx = { hello: [0, 2], world: [1] };
    expect(restoreOpenAlexAbstract(idx)).toBe('hello world hello');
  });

  it('无索引返回 undefined', () => {
    expect(restoreOpenAlexAbstract(undefined)).toBeUndefined();
  });
});

describe('searchPapers (allSettled 容错 + 去重)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('单源失败只记入 failedSources，不拖垮其余源', async () => {
    // openalex 抛错，arxiv 正常返回一条
    const arxivXml =
      '<feed><entry><id>http://arxiv.org/abs/2401.00001</id>' +
      '<title>Mamba paper</title><summary>state space</summary>' +
      '<published>2024-01-01</published>' +
      '<author><name>Bob</name></author></entry></feed>';

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('openalex')) {
          return Promise.resolve({ ok: false, status: 500 } as Response);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(arxivXml),
        } as Response);
      }),
    );

    const outcome = await searchPapers(
      { keywords: 'mamba', field: 'mamba' },
      ['openalex', 'arxiv'],
    );

    expect(outcome.failedSources).toContain('OpenAlex');
    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0].title).toBe('Mamba paper');
    expect(outcome.results[0].source).toBe('arxiv');
  });

  it('无选中源时直接返回空', async () => {
    const outcome = await searchPapers({ keywords: 'x' }, []);
    expect(outcome.results).toEqual([]);
    expect(outcome.failedSources).toEqual([]);
  });
});
