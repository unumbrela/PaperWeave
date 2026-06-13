import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildKeywordQuery,
  shouldKeepPaper,
  restoreOpenAlexAbstract,
  searchPapers,
  normalizeTitleKey,
  mergeDuplicates,
  interleaveBySource,
  withinYearRange,
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

describe('normalizeTitleKey / mergeDuplicates（跨源合并）', () => {
  it('标题归一化：大小写/标点/空白差异同键', () => {
    expect(normalizeTitleKey('Mamba: Linear-Time Sequence Modeling')).toBe(
      normalizeTitleKey('  mamba — linear time sequence modeling!  '),
    );
  });

  it('同篇论文跨源合并：缺失字段互补（引用数取有的，PDF 取有的），保留先到源', () => {
    const merged = mergeDuplicates([
      paper({ id: 'oa1', source: 'openalex', title: 'Mamba Paper', citations: 320, pdfUrl: undefined, venue: 'ICLR' }),
      paper({ id: 'ax1', source: 'arxiv', title: 'Mamba Paper!', citations: undefined, pdfUrl: 'https://arxiv.org/pdf/1.pdf' }),
      paper({ id: 'other', source: 'arxiv', title: 'Different Paper' }),
    ]);

    expect(merged).toHaveLength(2);
    const m = merged.find((p) => p.id === 'oa1')!;
    expect(m.source).toBe('openalex'); // 先到者保留身份
    expect(m.citations).toBe(320); // 引用数来自 OpenAlex
    expect(m.pdfUrl).toBe('https://arxiv.org/pdf/1.pdf'); // PDF 从 arXiv 补齐
    expect(m.venue).toBe('ICLR');
  });

  it('引用数为 0 不被当成缺失覆盖', () => {
    const merged = mergeDuplicates([
      paper({ id: 'a', title: 'T', citations: 0 }),
      paper({ id: 'b', title: 'T', citations: 99 }),
    ]);
    expect(merged[0].citations).toBe(0);
  });
});

describe('interleaveBySource（综合排序 = 按源交错）', () => {
  it('各源内部保持原序，跨源轮流取', () => {
    const out = interleaveBySource([
      paper({ id: 'o1', source: 'openalex' }),
      paper({ id: 'o2', source: 'openalex' }),
      paper({ id: 'o3', source: 'openalex' }),
      paper({ id: 'a1', source: 'arxiv' }),
      paper({ id: 'a2', source: 'arxiv' }),
    ]);
    expect(out.map((p) => p.id)).toEqual(['o1', 'a1', 'o2', 'a2', 'o3']);
  });

  it('单源时为恒等', () => {
    const input = [paper({ id: '1' }), paper({ id: '2' })];
    expect(interleaveBySource(input).map((p) => p.id)).toEqual(['1', '2']);
  });
});

describe('withinYearRange（年份后置过滤，闭区间）', () => {
  const q = { startYear: 2024, endYear: 2026 };
  it('边界年包含（回归：此前 2024/2026 被严格不等排掉）', () => {
    expect(withinYearRange(paper({ year: 2024 }), q)).toBe(true);
    expect(withinYearRange(paper({ year: 2026 }), q)).toBe(true);
    expect(withinYearRange(paper({ year: 2023 }), q)).toBe(false);
    expect(withinYearRange(paper({ year: 2027 }), q)).toBe(false);
  });
  it('无年份字段不误杀', () => {
    expect(withinYearRange(paper({ year: undefined }), q)).toBe(true);
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

  it('上游请求带正确的年份参数（OpenAlex 含边界 / arXiv submittedDate / S2 范围 + fields）', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        calls.push(url);
        if (url.includes('openalex')) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) } as Response);
        }
        if (url.includes('semanticscholar')) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) } as Response);
        }
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('<feed></feed>') } as Response);
      }),
    );

    await searchPapers(
      { keywords: 'mamba', startYear: 2024, endYear: 2026 },
      ['openalex', 'arxiv', 'semantic-scholar'],
    );

    const oa = calls.find((u) => u.includes('openalex'))!;
    // 严格不等 ±1 后等价于闭区间 [2024, 2026]
    expect(oa).toContain('publication_year:>2023');
    expect(oa).toContain('publication_year:<2027');

    const ax = calls.find((u) => u.includes('export.arxiv.org'))!;
    expect(ax).toContain('submittedDate:%5B202401010000+TO+202612312359%5D');

    const s2 = calls.find((u) => u.includes('semanticscholar'))!;
    expect(s2).toContain('year=2024-2026');
    expect(s2).toContain('fields='); // 不带 fields 时 S2 只回 paperId+title
    expect(s2).toContain('citationCount');
  });

  it('综合排序：跨源交错而非按引用数重排（回归：无引用数的 arXiv 整体沉底）', async () => {
    const openalexJson = {
      results: [
        { id: 'https://openalex.org/W1', title: 'OA One', authorships: [], publication_year: 2025, cited_by_count: 900 },
        { id: 'https://openalex.org/W2', title: 'OA Two', authorships: [], publication_year: 2025, cited_by_count: 50 },
      ],
    };
    const arxivXml =
      '<feed><entry><id>http://arxiv.org/abs/2501.00001</id><title>AX One</title>' +
      '<summary>s</summary><published>2025-01-01</published><author><name>A</name></author></entry>' +
      '<entry><id>http://arxiv.org/abs/2501.00002</id><title>AX Two</title>' +
      '<summary>s</summary><published>2025-02-01</published><author><name>B</name></author></entry></feed>';

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('openalex')) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(openalexJson) } as Response);
        }
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(arxivXml) } as Response);
      }),
    );

    const outcome = await searchPapers({ keywords: 'x', sortBy: 'relevance' }, ['openalex', 'arxiv']);
    expect(outcome.results.map((p) => p.title)).toEqual(['OA One', 'AX One', 'OA Two', 'AX Two']);
  });

  it('arXiv 请求 URL 使用合法的 sortOrder=descending（回归：传 desc 会被 arXiv 400）', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        calls.push(url);
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve('<feed></feed>'),
        } as Response);
      }),
    );

    await searchPapers({ keywords: 'diffusion model' }, ['arxiv']);

    const arxivUrl = calls.find((u) => u.includes('export.arxiv.org'));
    expect(arxivUrl).toBeDefined();
    expect(arxivUrl).toContain('sortOrder=descending');
    expect(arxivUrl).not.toContain('sortOrder=desc&');
    expect(arxivUrl?.endsWith('sortOrder=desc')).toBe(false);
  });
});
