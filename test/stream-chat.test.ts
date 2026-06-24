import { describe, it, expect, vi, beforeEach } from 'vitest';

// streamChat 多供应商流式 fallback —— P0「默认配置可达」的盖章测试：
// ① 零 key 给出可操作的「未配置」错误；② DeepSeek 首 token 前失败自动落到 OpenAI；
// ③ deepseekModel 档位覆盖（idea-generator 的 reasoner）只影响 DeepSeek attempt。

const { createMock, ctorCalls } = vi.hoisted(() => ({
  createMock: vi.fn(),
  ctorCalls: [] as Array<{ apiKey: string; baseURL?: string }>,
}));

vi.mock('openai', () => {
  class FakeOpenAI {
    chat: { completions: { create: (params: unknown) => unknown } };
    constructor(cfg: { apiKey: string; baseURL?: string }) {
      ctorCalls.push(cfg);
      this.chat = { completions: { create: (params: unknown) => createMock(cfg, params) } };
    }
  }
  return { OpenAI: FakeOpenAI };
});

// Gemini 在本组测试里不应被触达；mock 掉避免真实 SDK 初始化
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      throw new Error('Gemini 不应在本测试中被调用');
    }
  },
}));

import { streamChat } from '@/lib/ai/stream';

/** 模拟 OpenAI 兼容流：逐 chunk 吐 delta.content */
async function* fakeChunks(texts: string[]) {
  for (const t of texts) yield { choices: [{ delta: { content: t } }] };
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const dec = new TextDecoder();
  let out = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += dec.decode(value, { stream: true });
  }
  return out;
}

const MESSAGES = [
  { role: 'system' as const, content: '测试 system' },
  { role: 'user' as const, content: '测试 prompt' },
];

beforeEach(() => {
  createMock.mockReset();
  ctorCalls.length = 0;
  // 隔离环境变量兜底：保证测试只看显式传入的 keys
  vi.stubEnv('DEEPSEEK_API_KEY', '');
  vi.stubEnv('OPENAI_API_KEY', '');
  vi.stubEnv('GOOGLE_API_KEY', '');
  vi.stubEnv('ZENMUX_API_KEY', '');
});

describe('streamChat 多供应商 fallback', () => {
  it('零 key 时抛出可操作的「未配置」错误', async () => {
    await expect(streamChat(MESSAGES, {}, {})).rejects.toThrow(/AI 服务未配置/);
  });

  it('DeepSeek 首 token 前失败 → 自动落到 OpenAI，且回调上报 openai', async () => {
    createMock.mockImplementation((cfg: { baseURL?: string }) => {
      if (cfg.baseURL) throw new Error('deepseek 503'); // DeepSeek attempt（带 baseURL）
      return fakeChunks(['hello', ' world']); // OpenAI attempt
    });

    let provider = '';
    const stream = await streamChat(
      MESSAGES,
      {},
      { deepseek: 'ds-key', openai: 'oa-key' },
      (meta) => { provider = meta.provider; },
    );

    expect(await readAll(stream)).toBe('hello world');
    expect(provider).toBe('openai');
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it('deepseekModel 覆盖生效：DeepSeek attempt 用指定档位', async () => {
    createMock.mockImplementation(() => fakeChunks(['ok']));

    const stream = await streamChat(
      MESSAGES,
      { deepseekModel: 'deepseek-reasoner' },
      { deepseek: 'ds-key' },
    );

    expect(await readAll(stream)).toBe('ok');
    const [, params] = createMock.mock.calls[0] as [unknown, { model: string }];
    expect(params.model).toBe('deepseek-reasoner');
  });

  it('选定 ZenMux 模型时优先用它，且带归属头与该 model', async () => {
    createMock.mockImplementation(() => fakeChunks(['via', ' zm']));

    let provider = '';
    const stream = await streamChat(
      MESSAGES,
      {},
      { deepseek: 'ds-key', zenmux: 'zm-key', zenmuxModel: 'anthropic/claude-sonnet-4.6' },
      (meta) => { provider = meta.provider; },
    );

    expect(await readAll(stream)).toBe('via zm');
    expect(provider).toBe('zenmux:anthropic/claude-sonnet-4.6');
    // 第一手就走 ZenMux（DeepSeek 没被触达）
    expect(createMock).toHaveBeenCalledTimes(1);
    const [cfg, params] = createMock.mock.calls[0] as [
      { baseURL?: string; defaultHeaders?: Record<string, string> },
      { model: string },
    ];
    expect(cfg.baseURL).toContain('zenmux.ai');
    expect(cfg.defaultHeaders?.['X-Title']).toBeTruthy();
    expect(params.model).toBe('anthropic/claude-sonnet-4.6');
  });

  it('仅有 ZenMux key、未选型时用兜底模型', async () => {
    createMock.mockImplementation(() => fakeChunks(['ok']));

    let provider = '';
    const stream = await streamChat(MESSAGES, {}, { zenmux: 'zm-key' }, (meta) => { provider = meta.provider; });

    expect(await readAll(stream)).toBe('ok');
    expect(provider).toMatch(/^zenmux:/);
  });

  it('全供应商失败时流以最后一个错误收尾（不静默吞掉）', async () => {
    createMock.mockImplementation(() => { throw new Error('upstream down'); });

    const stream = await streamChat(MESSAGES, {}, { deepseek: 'ds-key', openai: 'oa-key' });
    await expect(readAll(stream)).rejects.toThrow('upstream down');
  });
});
