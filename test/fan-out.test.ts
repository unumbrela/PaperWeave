import { describe, it, expect, vi, afterEach } from 'vitest';

// 查询扩展 fan-out 的盖章测试：
// ① rerankFanout 以「命中子查询数」为主权重，时新/引用为次权重，稳定；
// ② runPooled 严格限制并发上限；
// ③ searchPapersExpanded 子查询≤1 退化为 searchPapers，多子查询按命中计数重排；
// ④ expandQuery 无 key / 调用失败一律降级单查询（守住「零 key 可用」闸门）。

// expandQuery 依赖的非流式 LLM 客户端：mock 掉，按用例返回或抛错
const { chatCompletionMock } = vi.hoisted(() => ({ chatCompletionMock: vi.fn() }));
vi.mock('@/lib/ai/client', () => ({ chatCompletion: chatCompletionMock }));

import {
  rerankFanout,
  runPooled,
  searchPapersExpanded,
  normalizeTitleKey,
} from '@/lib/paper-search/search-service';
import { extractStringArray, expandQuery } from '@/lib/paper-search/query-expand';
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

const NOW = new Date().getFullYear();

describe('extractStringArray', () => {
  it('解析裸 JSON 数组', () => {
    expect(extractStringArray('["a","b"]')).toEqual(['a', 'b']);
  });
  it('容忍 ```json 围栏与前后杂文', () => {
    expect(extractStringArray('好的：\n```json\n["x", "y"]\n```')).toEqual(['x', 'y']);
  });
  it('丢弃非字符串项，去空白', () => {
    expect(extractStringArray('[1, "  y  ", null, "z"]')).toEqual(['y', 'z']);
  });
  it('空数组 / 解析失败返回 null', () => {
    expect(extractStringArray('[]')).toBeNull();
    expect(extractStringArray('not json')).toBeNull();
  });
});

describe('rerankFanout（命中数为主权重）', () => {
  it('命中更多子查询的论文排前，盖过高引用老论文', () => {
    const a = paper({ id: 'a', title: 'A', year: 2018, citations: 5000 }); // 1 命中 + 高引用
    const b = paper({ id: 'b', title: 'B', year: 2018, citations: 0 }); // 2 命中
    const hits = new Map([
      [normalizeTitleKey('A'), 1],
      [normalizeTitleKey('B'), 2],
    ]);
    expect(rerankFanout([a, b], hits).map((p) => p.id)).toEqual(['b', 'a']);
  });

  it('命中数相同时，更新的论文排前', () => {
    const cNew = paper({ id: 'cNew', title: 'C', year: NOW });
    const dOld = paper({ id: 'dOld', title: 'D', year: NOW - 10 });
    const hits = new Map([
      [normalizeTitleKey('C'), 1],
      [normalizeTitleKey('D'), 1],
    ]);
    expect(rerankFanout([dOld, cNew], hits).map((p) => p.id)).toEqual(['cNew', 'dOld']);
  });

  it('未登记命中数的论文按 1 次处理（不报错）', () => {
    const p = paper({ id: 'p', title: 'Z' });
    expect(rerankFanout([p], new Map()).map((x) => x.id)).toEqual(['p']);
  });
});

describe('runPooled（并发上限）', () => {
  it('同时在飞数量不超过 limit，结果保序', async () => {
    let active = 0;
    let peak = 0;
    const mk = (val: number) => () =>
      new Promise<number>((resolve) => {
        active++;
        peak = Math.max(peak, active);
        setTimeout(() => {
          active--;
          resolve(val);
        }, 15);
      });

    const settled = await runPooled([mk(1), mk(2), mk(3), mk(4), mk(5)], 2);
    expect(peak).toBeLessThanOrEqual(2);
    expect(settled.map((s) => (s.status === 'fulfilled' ? s.value : null))).toEqual([1, 2, 3, 4, 5]);
  });

  it('单个任务抛错只标记该项 rejected，不影响其余', async () => {
    const ok = () => Promise.resolve('ok');
    const bad = () => Promise.reject(new Error('boom'));
    const settled = await runPooled([ok, bad, ok], 3);
    expect(settled[0].status).toBe('fulfilled');
    expect(settled[1].status).toBe('rejected');
    expect(settled[2].status).toBe('fulfilled');
  });
});

describe('searchPapersExpanded', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const oaWork = (title: string, year: number, cites: number) => ({
    id: `https://openalex.org/W-${title}`,
    title,
    authorships: [],
    publication_year: year,
    cited_by_count: cites,
    abstract: 'abs',
  });

  it('子查询≤1 退化为普通 searchPapers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('openalex')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ results: [oaWork('Solo', NOW, 3)] }),
          } as Response);
        }
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('<feed></feed>') } as Response);
      }),
    );

    const out = await searchPapersExpanded({ keywords: 'x' }, ['openalex', 'arxiv'], ['only-one']);
    expect(out.results.map((p) => p.title)).toEqual(['Solo']);
  });

  it('多子查询：被多条子查询召回的论文（命中数高）排最前', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('openalex')) {
          // 子查询作为 search= 参数出现在 url 中，据此返回不同结果集
          if (url.includes('alpha')) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({ results: [oaWork('Shared', 2020, 10), oaWork('AlphaOnly', 2020, 99)] }),
            } as Response);
          }
          if (url.includes('beta')) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({ results: [oaWork('Shared', 2020, 10), oaWork('BetaOnly', 2020, 99)] }),
            } as Response);
          }
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) } as Response);
        }
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('<feed></feed>') } as Response);
      }),
    );

    const out = await searchPapersExpanded(
      { keywords: 'x', sortBy: 'relevance' },
      ['openalex', 'arxiv'],
      ['alpha', 'beta'],
    );

    const titles = out.results.map((p) => p.title);
    expect(titles[0]).toBe('Shared'); // 命中两条子查询 → 主题中心
    expect(titles).toContain('AlphaOnly');
    expect(titles).toContain('BetaOnly');
    expect(titles).toHaveLength(3); // 跨子查询去重后三篇
  });
});

describe('expandQuery（降级守闸门）', () => {
  afterEach(() => chatCompletionMock.mockReset());

  it('无 AI key → 仅返回原始关键词查询（零 key 可用）', async () => {
    const out = await expandQuery({ keywords: 'mamba segmentation' }, {});
    expect(out).toEqual(['mamba segmentation']);
    expect(chatCompletionMock).not.toHaveBeenCalled();
  });

  it('无关键词 → 返回空（无从扩展）', async () => {
    expect(await expandQuery({}, { deepseek: 'k' })).toEqual([]);
  });

  it('有 key 且成功 → 首条为原始查询，附 LLM 子查询并去重', async () => {
    chatCompletionMock.mockResolvedValue('["mamba segmentation", "state space medical imaging"]');
    const out = await expandQuery({ keywords: 'mamba segmentation' }, { deepseek: 'k' });
    expect(out[0]).toBe('mamba segmentation'); // 原始查询始终在首位
    expect(out).toContain('state space medical imaging');
    expect(new Set(out).size).toBe(out.length); // 去重
  });

  it('LLM 调用失败 → 降级为单查询', async () => {
    chatCompletionMock.mockRejectedValue(new Error('upstream down'));
    const out = await expandQuery({ keywords: 'diffusion' }, { openai: 'k' });
    expect(out).toEqual(['diffusion']);
  });
});
