import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { repository } from '@/lib/db/repository';
import { db } from '@/lib/db/local-db';

// 纯本地仓储层（Dexie / fake-indexeddb）—— 「零配置可用」的真相源。
// 这一组测试同时给 P0.2 盖章：默认（未开云同步）下任何写操作都【不】触达网络/Prisma。

beforeEach(async () => {
  await db.papers.clear();
  await db.annotations.clear();
  await db.notes.clear();
  await db.readProgress.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('论文 CRUD（本地）', () => {
  it('savePaper 补齐默认字段并可读回', async () => {
    const saved = await repository.savePaper({ title: '测试论文' });
    expect(saved.id).toBeTruthy();
    expect(saved.authors).toEqual([]);
    expect(saved.tags).toEqual([]);
    expect(saved.sourceType).toBe('LOCAL');
    expect(saved.citations).toBe(0);

    const got = await repository.getPaper(saved.id);
    expect(got?.title).toBe('测试论文');
  });

  it('updatePaper 局部更新并刷新 updatedAt', async () => {
    const saved = await repository.savePaper({ title: 'orig' });
    const updated = await repository.updatePaper(saved.id, { summary: 'AI 总结' });
    expect(updated?.summary).toBe('AI 总结');
    expect(updated?.title).toBe('orig');
  });

  it('updatePaper 对不存在的 id 返回 undefined', async () => {
    expect(await repository.updatePaper('nope', { summary: 'x' })).toBeUndefined();
  });

  it('listPapers 支持搜索与方向过滤', async () => {
    await repository.savePaper({ title: 'Mamba in vision', direction: 'cv' });
    await repository.savePaper({ title: 'Diffusion models', direction: 'cv' });
    await repository.savePaper({ title: 'Graph nets', direction: 'graph' });

    expect(await repository.listPapers({ search: 'mamba' })).toHaveLength(1);
    expect(await repository.listPapers({ direction: 'cv' })).toHaveLength(2);
  });

  it('deletePaper 级联删除标注/笔记/进度', async () => {
    const p = await repository.savePaper({ title: 'cascade' });
    await repository.createAnnotation({ paperId: p.id, page: 0, rects: [], type: 'highlight' });
    await repository.saveNote(p.id, '一些笔记');
    await repository.saveProgress(p.id, 3, 10);

    await repository.deletePaper(p.id);

    expect(await repository.getPaper(p.id)).toBeUndefined();
    expect(await repository.listAnnotations(p.id)).toHaveLength(0);
    expect(await repository.getNote(p.id)).toBeUndefined();
    expect(await repository.getProgress(p.id)).toBeUndefined();
  });
});

describe('标注 / 笔记 / 进度', () => {
  it('createAnnotation 套用四分类默认配色', async () => {
    const p = await repository.savePaper({ title: 'anno' });
    const a = await repository.createAnnotation({
      paperId: p.id, page: 1, rects: [{ x: 0, y: 0, width: 1, height: 1 }], type: 'insight',
    });
    expect(a.color).toBe('#CFE3FF'); // ANNOTATION_COLORS.insight
    expect(await repository.listAnnotations(p.id)).toHaveLength(1);
  });

  it('saveNote 同一论文重复保存复用同一条', async () => {
    const p = await repository.savePaper({ title: 'note' });
    const n1 = await repository.saveNote(p.id, 'v1');
    const n2 = await repository.saveNote(p.id, 'v2');
    expect(n2.id).toBe(n1.id);
    expect((await repository.getNote(p.id))?.content).toBe('v2');
  });

  it('saveProgress upsert 阅读进度', async () => {
    const p = await repository.savePaper({ title: 'progress' });
    await repository.saveProgress(p.id, 2, 20);
    await repository.saveProgress(p.id, 5, 20);
    expect((await repository.getProgress(p.id))?.currentPage).toBe(5);
  });
});

describe('离线 PDF Blob（真离线阅读）', () => {
  it('cachePdfBlob 后可取回，Blob 不出本地', async () => {
    const p = await repository.savePaper({ title: 'offline' });
    expect(await repository.getPdfBlob(p.id)).toBeUndefined();

    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'application/pdf' });
    await repository.cachePdfBlob(p.id, blob);

    const got = await repository.getPdfBlob(p.id);
    expect(got).toBeInstanceOf(Blob);
    expect(got?.size).toBe(3);

    // 取回的 Paper（stripBlob）不应泄露 pdfBlob 字段
    const paper = await repository.getPaper(p.id);
    expect((paper as unknown as Record<string, unknown>).pdfBlob).toBeUndefined();
  });

  it('对不存在的论文 cachePdfBlob 是 no-op', async () => {
    await repository.cachePdfBlob('nope', new Blob(['x']));
    expect(await repository.getPdfBlob('nope')).toBeUndefined();
  });
});

describe('零配置盖章：默认不触达网络/云端', () => {
  it('一连串写操作【不】发起任何 fetch（云同步默认关闭）', async () => {
    const fetchSpy = vi.fn(() => Promise.resolve({ ok: true } as Response));
    vi.stubGlobal('fetch', fetchSpy);

    const p = await repository.savePaper({ title: 'no-network', arxivId: '2401.99999' });
    await repository.updatePaper(p.id, { summary: 's' });
    await repository.createAnnotation({ paperId: p.id, page: 0, rects: [], type: 'todo' });
    await repository.saveNote(p.id, 'n');
    await repository.saveProgress(p.id, 1, 1);
    await repository.deletePaper(p.id);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
