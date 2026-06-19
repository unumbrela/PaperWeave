import { describe, it, expect, vi, afterEach } from 'vitest';

// 第二档检索质量：① DOI/arXiv 主键跨源去重（修预印本↔正式版漏合并）；
// ② Europe PMC 源解析（生物医学 + bioRxiv/medRxiv）；③ LLM 精排纯逻辑与降级。

const { chatCompletionMock } = vi.hoisted(() => ({ chatCompletionMock: vi.fn() }));
vi.mock('@/lib/ai/client', () => ({ chatCompletion: chatCompletionMock }));

import {
  normalizeDoi,
  identityKeys,
  mergeDuplicates,
  searchEuropePMC,
} from '@/lib/paper-search/search-service';
import {
  extractIndexArray,
  applyRerankOrder,
  llmRerankTopK,
} from '@/lib/paper-search/llm-rerank';
import type { PaperResult } from '@/lib/paper-search/types';

function paper(overrides: Partial<PaperResult> = {}): PaperResult {
  return {
    id: 'x',
    title: 'Some paper',
    authors: ['Alice'],
    url: 'https://example.com',
    source: 'arxiv',
    ...overrides,
  };
}

describe('normalizeDoi', () => {
  it('去 doi.org 前缀并小写', () => {
    expect(normalizeDoi('https://doi.org/10.1109/ABC')).toBe('10.1109/abc');
    expect(normalizeDoi('http://dx.doi.org/10.1/X')).toBe('10.1/x');
    expect(normalizeDoi('10.48550/arXiv.2401.00001')).toBe('10.48550/arxiv.2401.00001');
  });
  it('空值返回 undefined', () => {
    expect(normalizeDoi(undefined)).toBeUndefined();
    expect(normalizeDoi('')).toBeUndefined();
  });
});

describe('identityKeys', () => {
  it('DOI / arXiv / 标题三类键，arXiv DOI 派生 arxiv 键', () => {
    const keys = identityKeys(paper({ title: 'T', doi: '10.48550/arXiv.2401.00001' }));
    expect(keys).toContain('doi:10.48550/arxiv.2401.00001');
    expect(keys).toContain('arxiv:2401.00001'); // 从 arXiv DOI 桥接
    expect(keys).toContain('title:t');
  });
  it('arxivId 去版本号', () => {
    expect(identityKeys(paper({ title: 'T', arxivId: '2401.00002v3' }))).toContain('arxiv:2401.00002');
  });
});

describe('mergeDuplicates（DOI/arXiv 主键去重）', () => {
  it('arXiv 预印本与 OpenAlex 记录经 arXiv DOI 桥接合并（标题不同也合）', () => {
    const merged = mergeDuplicates([
      paper({ id: 'ax', source: 'arxiv', title: 'Mamba', arxivId: '2401.00001', pdfUrl: 'https://arxiv.org/pdf/2401.00001' }),
      paper({ id: 'oa', source: 'openalex', title: 'Mamba: Linear-Time Sequence Modeling', doi: 'https://doi.org/10.48550/arXiv.2401.00001', citations: 120 }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].source).toBe('arxiv'); // 先到者保留身份
    expect(merged[0].citations).toBe(120); // 引用从 OpenAlex 补齐
    expect(merged[0].pdfUrl).toBe('https://arxiv.org/pdf/2401.00001');
  });

  it('同 DOI 不同标题格式合并', () => {
    const merged = mergeDuplicates([
      paper({ id: 'c', source: 'crossref', title: 'A Study', doi: '10.1109/x' }),
      paper({ id: 'o', source: 'openalex', title: 'A Study: An Extended Version', doi: 'https://doi.org/10.1109/X', citations: 9 }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].citations).toBe(9);
  });

  it('arXiv 版本号差异合并（v1 vs v2）', () => {
    const merged = mergeDuplicates([
      paper({ id: 'v1', source: 'arxiv', title: 'P', arxivId: '2401.00009v1' }),
      paper({ id: 'v2', source: 'arxiv', title: 'P revised', arxivId: '2401.00009v2' }),
    ]);
    expect(merged).toHaveLength(1);
  });

  it('无任何标识时仍按标题兜底去重，引用数 0 不被覆盖', () => {
    const merged = mergeDuplicates([
      paper({ id: 'a', title: 'T', citations: 0 }),
      paper({ id: 'b', title: 't', citations: 99 }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].citations).toBe(0);
  });

  it('不同论文不被误合并', () => {
    const merged = mergeDuplicates([
      paper({ id: 'a', title: 'Alpha', doi: '10.1/a' }),
      paper({ id: 'b', title: 'Beta', doi: '10.1/b' }),
    ]);
    expect(merged).toHaveLength(2);
  });
});

describe('searchEuropePMC（解析）', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('映射标题/作者/年份/引用/DOI，source=europepmc', async () => {
    const json = {
      resultList: {
        result: [
          {
            id: 'PPR123',
            source: 'PPR',
            doi: '10.1101/2024.01.01.123',
            title: 'A biomedical preprint',
            authorString: 'Smith J, Doe A.',
            pubYear: '2024',
            citedByCount: 7,
            abstractText: 'we study cells',
            journalInfo: { journal: { title: 'bioRxiv' } },
            fullTextUrlList: { fullTextUrl: [{ documentStyle: 'pdf', url: 'https://example.com/p.pdf' }] },
          },
        ],
      },
    };
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(json) } as Response)));

    const out = await searchEuropePMC({ keywords: 'cells' });
    expect(out).toHaveLength(1);
    const p = out[0];
    expect(p.source).toBe('europepmc');
    expect(p.title).toBe('A biomedical preprint');
    expect(p.authors).toEqual(['Smith J', 'Doe A']);
    expect(p.year).toBe(2024);
    expect(p.citations).toBe(7);
    expect(p.doi).toBe('10.1101/2024.01.01.123');
    expect(p.pdfUrl).toBe('https://example.com/p.pdf');
    expect(p.url).toContain('europepmc.org/article/PPR/PPR123');
  });

  it('无关键词直接返回空（不打网络）', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect(await searchEuropePMC({})).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('extractIndexArray', () => {
  it('解析编号数组（含围栏）', () => {
    expect(extractIndexArray('[2,0,1]')).toEqual([2, 0, 1]);
    expect(extractIndexArray('排序：\n```json\n[1, 0]\n```')).toEqual([1, 0]);
  });
  it('丢弃非整数，空/失败返回 null', () => {
    expect(extractIndexArray('[0, "x", 1.5, 2]')).toEqual([0, 2]);
    expect(extractIndexArray('[]')).toBeNull();
    expect(extractIndexArray('nope')).toBeNull();
  });
});

describe('applyRerankOrder', () => {
  const rs = [0, 1, 2, 3, 4].map((i) => paper({ id: `r${i}` }));
  it('按编号重排前 K，K 之后原样追加', () => {
    const out = applyRerankOrder(rs, 3, [2, 0, 1]);
    expect(out.map((p) => p.id)).toEqual(['r2', 'r0', 'r1', 'r3', 'r4']);
  });
  it('LLM 漏判的编号按原序补回', () => {
    const out = applyRerankOrder(rs, 3, [2]);
    expect(out.map((p) => p.id)).toEqual(['r2', 'r0', 'r1', 'r3', 'r4']);
  });
  it('越界编号被忽略', () => {
    const out = applyRerankOrder(rs, 3, [9, 1]);
    expect(out.map((p) => p.id)).toEqual(['r1', 'r0', 'r2', 'r3', 'r4']);
  });
});

describe('llmRerankTopK（降级守闸门）', () => {
  afterEach(() => chatCompletionMock.mockReset());

  it('无 key → 原样返回，不调用 LLM', async () => {
    const rs = [paper({ id: 'a' }), paper({ id: 'b' })];
    const out = await llmRerankTopK(rs, { keywords: 'x', researchGoal: 'g' }, {});
    expect(out).toEqual(rs);
    expect(chatCompletionMock).not.toHaveBeenCalled();
  });

  it('结果不足 2 条 → 原样返回', async () => {
    const rs = [paper({ id: 'a' })];
    expect(await llmRerankTopK(rs, { keywords: 'x' }, { deepseek: 'k' })).toEqual(rs);
  });

  it('有 key 且成功 → 按 LLM 顺序重排', async () => {
    chatCompletionMock.mockResolvedValue('[1,0]');
    const rs = [paper({ id: 'a' }), paper({ id: 'b' }), paper({ id: 'c' })];
    const out = await llmRerankTopK(rs, { keywords: 'x', researchGoal: 'g' }, { deepseek: 'k' }, 2);
    expect(out.map((p) => p.id)).toEqual(['b', 'a', 'c']);
  });

  it('LLM 失败 → 原样返回', async () => {
    chatCompletionMock.mockRejectedValue(new Error('down'));
    const rs = [paper({ id: 'a' }), paper({ id: 'b' })];
    expect(await llmRerankTopK(rs, { keywords: 'x', researchGoal: 'g' }, { openai: 'k' })).toEqual(rs);
  });
});
