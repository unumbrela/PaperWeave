import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import Dexie from 'dexie';

// v2 → v3 升级迁移：内嵌在 papers 记录上的 pdfBlob 必须搬进独立 pdfBlobs 表，
// 且原记录上的 pdfBlob 字段被删除（listPapers 不再把 PDF 二进制载入内存）。
//
// 注意：本文件不能与 repository.test.ts 共享单例 —— 这里先用旧 schema 建库，
// 再动态 import local-db 触发 v3 升级，因此必须独立成文件（vitest 按文件隔离环境）。

describe('Dexie v2 → v3 迁移（pdfBlob 拆表）', () => {
  it('存量内嵌 pdfBlob 迁入 pdfBlobs 表并从 papers 记录移除', async () => {
    // 1. 按旧版（v2）schema 建库并写入一条带内嵌 pdfBlob 的论文
    const legacy = new Dexie('paper_workspace');
    legacy.version(1).stores({
      papers: 'id, arxivId, title, createdAt',
      annotations: 'id, paperId, page, createdAt',
      notes: 'id, paperId, updatedAt',
      readProgress: 'id, paperId, lastReadAt',
    });
    legacy.version(2).stores({
      embeddings: '[paperId+model], paperId, model',
    });

    const blob = new Blob([new Uint8Array([7, 8, 9])], { type: 'application/pdf' });
    await legacy.table('papers').put({
      id: 'legacy-1',
      title: '迁移前的论文',
      authors: [],
      sourceType: 'LOCAL',
      tags: [],
      citations: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      cachedAt: '2026-01-01T00:00:00.000Z',
      pdfBlob: blob,
    });
    legacy.close();

    // 2. 打开 v3（动态 import 触发 local-db 单例的 open + upgrade）
    const { db, pdfBlobDB } = await import('@/lib/db/local-db');
    await db.open();

    // 3. Blob 已迁入独立表，且内容完整
    const migrated = await pdfBlobDB.get('legacy-1');
    expect(migrated).toBeInstanceOf(Blob);
    expect(migrated?.size).toBe(3);

    // 4. papers 记录上不再有 pdfBlob 字段
    const paper = (await db.table('papers').get('legacy-1')) as Record<string, unknown>;
    expect(paper.title).toBe('迁移前的论文');
    expect('pdfBlob' in paper).toBe(false);
  });
});
