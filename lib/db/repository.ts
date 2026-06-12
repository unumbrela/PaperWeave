/**
 * 统一仓储层 —— 论文工作流的「单一数据真相源」
 *
 * 设计原则（见 CORE-IMPROVEMENT-PLAN.md · P0）：
 *   1. **本地 Dexie(IndexedDB) 为唯一真相源**：列表、详情、入库、标注、笔记、
 *      阅读进度，全部读写本地。clone 即用、零配置、可离线。
 *   2. **云端为可选同步层**：仅当用户已登录（Supabase Auth）时，写操作会
 *      「fire-and-forget」地镜像到 Supabase Postgres（失败不影响本地）。
 *      未登录 / 未配置 Supabase 时 cloudSync 全部 no-op，不发起任何网络请求。
 *
 * 所有 UI / hooks 只调用本模块，**不再** 直接 `fetch('/api/papers')` 或混用
 * `cache-service`，从根上消除「本地有云端没有 / 列表与详情不一致」的脏状态。
 */

import {
  paperDB,
  annotationDB,
  noteDB,
  progressDB,
  pdfBlobDB,
  type CachedPaper,
} from './local-db'
import type { Paper, Annotation, AnnotationType, ResearchNote, Rect } from './types'
import { ANNOTATION_COLORS } from './types'
import { cloudSync } from '@/lib/sync/cloud-sync'

// ──────────────────────────────────────────────────────────
// 云同步（可选）
// ──────────────────────────────────────────────────────────
//
// 登录后，写操作 best-effort 镜像到 Supabase（带 user_id + RLS）；未登录或未配置
// 时 cloudSync 全部 no-op，退回纯本地 Dexie。所有 cloudSync 调用都不 await，
// 本地已落库即返回，云端异步进行、失败不影响本地真相源。

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ──────────────────────────────────────────────────────────
// 论文
// ──────────────────────────────────────────────────────────

export interface ListPapersOptions {
  sortBy?: 'createdAt' | 'publishedAt'
  sortOrder?: 'asc' | 'desc'
  tags?: string[]
  direction?: string
  sourceType?: string
  search?: string
}

export const repository = {
  /** 论文列表（本地 Dexie，支持筛选与排序） */
  async listPapers(opts: ListPapersOptions = {}): Promise<Paper[]> {
    const {
      sortBy = 'createdAt',
      sortOrder = 'desc',
      tags,
      direction,
      sourceType,
      search,
    } = opts

    let papers = await paperDB.getAll()

    if (direction) papers = papers.filter((p) => p.direction === direction)
    if (sourceType) papers = papers.filter((p) => p.sourceType === sourceType)
    if (tags && tags.length > 0) {
      papers = papers.filter((p) => tags.some((t) => p.tags?.includes(t)))
    }
    if (search) {
      const q = search.toLowerCase()
      papers = papers.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.abstract?.toLowerCase().includes(q) ?? false),
      )
    }

    papers.sort((a, b) => {
      const av = (a[sortBy] as string) || a.createdAt || ''
      const bv = (b[sortBy] as string) || b.createdAt || ''
      const cmp = av.localeCompare(bv)
      return sortOrder === 'desc' ? -cmp : cmp
    })

    // PDF 二进制在独立表（pdfBlobs），列表查询天然不触达大对象
    return papers.map(stripLocal)
  },

  async getPaper(id: string): Promise<Paper | undefined> {
    const p = await paperDB.getById(id)
    return p ? stripLocal(p) : undefined
  },

  async getPaperByArxivId(arxivId: string): Promise<Paper | undefined> {
    return paperDB.getByArxivId(arxivId)
  },

  async paperExists(id: string): Promise<boolean> {
    return paperDB.exists(id)
  },

  async arxivExists(arxivId: string): Promise<boolean> {
    return !!(await paperDB.getByArxivId(arxivId))
  },

  /** 按标题精确查重（忽略大小写）——非 arXiv 来源（如 OpenAlex）入库前防重复 */
  async findPaperByTitle(title: string): Promise<Paper | undefined> {
    const hit = await paperDB.getByTitle(title)
    return hit ? stripLocal(hit) : undefined
  },

  /**
   * 入库 / 更新论文。缺省字段会补齐合理默认值；返回落库后的完整 Paper。
   */
  async savePaper(input: Partial<Paper> & { title: string; pdfBlob?: Blob }): Promise<Paper> {
    const now = new Date().toISOString()
    const id = input.id || genId('paper')

    const paper: CachedPaper = {
      id,
      arxivId: input.arxivId,
      title: input.title,
      abstract: input.abstract,
      authors: input.authors ?? [],
      sourceType: input.sourceType ?? 'LOCAL',
      sourceUrl: input.sourceUrl,
      pdfPath: input.pdfPath,
      publishedAt: input.publishedAt,
      tags: input.tags ?? [],
      direction: input.direction,
      notes: input.notes,
      summary: input.summary,
      methodology: input.methodology,
      contribution: input.contribution,
      citations: typeof input.citations === 'number' ? input.citations : 0,
      createdAt: input.createdAt || now,
      updatedAt: now,
      cachedAt: now,
    }

    await paperDB.upsert(paper)
    if (input.pdfBlob) await pdfBlobDB.put(id, input.pdfBlob)
    const clean = stripLocal(paper)
    void cloudSync.pushPaper(clean)
    return clean
  },

  /** 局部更新论文字段（如 AI 分析结果回写） */
  async updatePaper(id: string, patch: Partial<Paper>): Promise<Paper | undefined> {
    const existing = await paperDB.getById(id)
    if (!existing) return undefined
    const merged: CachedPaper = {
      ...(existing as CachedPaper),
      ...patch,
      updatedAt: new Date().toISOString(),
    }
    await paperDB.upsert(merged)
    const clean = stripLocal(merged)
    void cloudSync.pushPaper(clean)
    return clean
  },

  /** 删除论文（级联删除其标注 / 笔记 / 进度，由 paperDB.delete 事务保证） */
  async deletePaper(id: string): Promise<void> {
    await paperDB.delete(id)
    void cloudSync.deletePaper(id)
  },

  // ────────────────────────────────────────────────────────
  // 离线 PDF（纯本地真离线阅读）
  // ────────────────────────────────────────────────────────

  /** 读取已离线缓存的 PDF 二进制；无缓存返回 undefined。 */
  async getPdfBlob(id: string): Promise<Blob | undefined> {
    return pdfBlobDB.get(id)
  },

  /**
   * 把 PDF 二进制写入本地缓存（独立表，不混进元数据记录），
   * 使该论文可在断网时阅读。Blob 永不出本地（不 pushToCloud）。
   */
  async cachePdfBlob(id: string, blob: Blob): Promise<void> {
    if (!(await paperDB.exists(id))) return
    await pdfBlobDB.put(id, blob)
  },

  // ────────────────────────────────────────────────────────
  // 标注
  // ────────────────────────────────────────────────────────

  async listAnnotations(paperId: string): Promise<Annotation[]> {
    const list = await annotationDB.getByPaperId(paperId)
    return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },

  /** 全部标注（跨论文，统计看板用） */
  async listAllAnnotations(): Promise<Annotation[]> {
    return annotationDB.getAll()
  },

  async createAnnotation(data: {
    paperId: string
    page: number
    rects: Rect[]
    selectedText?: string
    type: AnnotationType
    comment?: string
    color?: string
  }): Promise<Annotation> {
    const annotation: Annotation = {
      id: genId('anno'),
      paperId: data.paperId,
      page: data.page,
      rects: data.rects,
      selectedText: data.selectedText ?? '',
      type: data.type,
      color: data.color ?? ANNOTATION_COLORS[data.type],
      comment: data.comment,
      createdAt: new Date().toISOString(),
    }
    await annotationDB.add(annotation)
    void cloudSync.pushAnnotation(annotation)
    return annotation
  },

  async updateAnnotation(
    id: string,
    patch: Partial<Pick<Annotation, 'type' | 'color' | 'comment' | 'aiSummary'>>,
  ): Promise<void> {
    await annotationDB.update(id, { ...patch, updatedAt: new Date().toISOString() })
    const updated = await annotationDB.getById(id)
    if (updated) void cloudSync.pushAnnotation(updated)
  },

  async deleteAnnotation(id: string): Promise<void> {
    await annotationDB.delete(id)
    void cloudSync.deleteAnnotation(id)
  },

  // ────────────────────────────────────────────────────────
  // 研究笔记
  // ────────────────────────────────────────────────────────

  async getNote(paperId: string): Promise<ResearchNote | undefined> {
    return noteDB.getByPaperId(paperId)
  },

  async saveNote(paperId: string, content: string, title?: string): Promise<ResearchNote> {
    const existing = await noteDB.getByPaperId(paperId)
    const now = new Date().toISOString()
    const note: ResearchNote = {
      id: existing?.id || genId('note'),
      paperId,
      title: title ?? existing?.title,
      content,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    }
    await noteDB.upsert(note)
    void cloudSync.pushNote(note)
    return note
  },

  // ────────────────────────────────────────────────────────
  // 阅读进度
  // ────────────────────────────────────────────────────────

  async getProgress(paperId: string) {
    return progressDB.getByPaperId(paperId)
  },

  async saveProgress(paperId: string, currentPage: number, totalPages: number) {
    await progressDB.update(paperId, currentPage, totalPages)
    void cloudSync.pushProgress(paperId, currentPage, totalPages)
  },
}

/** 去掉本地缓存元字段，返回可安全 JSON 化的纯 Paper */
function stripLocal(p: CachedPaper): Paper {
  const { cachedAt: _cachedAt, ...rest } = p
  void _cachedAt
  return rest
}

export default repository
