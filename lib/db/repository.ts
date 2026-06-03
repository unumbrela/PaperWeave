/**
 * 统一仓储层 —— 论文工作流的「单一数据真相源」
 *
 * 设计原则（见 CORE-IMPROVEMENT-PLAN.md · P0）：
 *   1. **本地 Dexie(IndexedDB) 为唯一真相源**：列表、详情、入库、标注、笔记、
 *      阅读进度，全部读写本地。clone 即用、零配置、可离线。
 *   2. **云端为可选同步层**：仅当显式开启 `NEXT_PUBLIC_ENABLE_CLOUD_SYNC=true`
 *      时，写操作会「fire-and-forget」地推送到服务端 `/api/*`（失败不影响本地）。
 *      默认关闭，避免未配数据库时走进会报错的 Prisma 路径。
 *
 * 所有 UI / hooks 只调用本模块，**不再** 直接 `fetch('/api/papers')` 或混用
 * `cache-service`，从根上消除「本地有云端没有 / 列表与详情不一致」的脏状态。
 */

import {
  paperDB,
  annotationDB,
  noteDB,
  progressDB,
  type CachedPaper,
} from './local-db'
import type { Paper, Annotation, AnnotationType, ResearchNote, Rect } from './types'
import { ANNOTATION_COLORS } from './types'

// ──────────────────────────────────────────────────────────
// 云同步开关（可选）
// ──────────────────────────────────────────────────────────

const CLOUD_SYNC_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_CLOUD_SYNC === 'true'

/** best-effort 推送到云端；任何失败都吞掉，绝不影响本地真相源 */
function pushToCloud(path: string, method: string, body?: unknown): void {
  if (!CLOUD_SYNC_ENABLED) return
  // 不 await：本地已落库，云端同步异步进行
  fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }).catch((err) => {
    console.warn(`[repository] 云端同步失败（已忽略，本地仍为准）: ${path}`, err)
  })
}

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

    // 列表不需要 PDF 二进制：剥离 Blob，避免把大对象灌进 UI 状态
    return papers.map(stripBlob)
  },

  async getPaper(id: string): Promise<Paper | undefined> {
    const p = await paperDB.getById(id)
    return p ? stripBlob(p) : undefined
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
      pdfBlob: input.pdfBlob,
      cachedAt: now,
    }

    await paperDB.upsert(paper)
    pushToCloud('/api/papers', 'POST', stripBlob(paper))
    return stripBlob(paper)
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
    pushToCloud(`/api/papers/${id}`, 'PUT', stripBlob(merged))
    return stripBlob(merged)
  },

  /** 删除论文（级联删除其标注 / 笔记 / 进度，由 paperDB.delete 事务保证） */
  async deletePaper(id: string): Promise<void> {
    await paperDB.delete(id)
    pushToCloud(`/api/papers/${id}`, 'DELETE')
  },

  // ────────────────────────────────────────────────────────
  // 离线 PDF（纯本地真离线阅读）
  // ────────────────────────────────────────────────────────

  /** 读取已离线缓存的 PDF 二进制；无缓存返回 undefined。 */
  async getPdfBlob(id: string): Promise<Blob | undefined> {
    const p = await paperDB.getById(id)
    return p?.pdfBlob
  },

  /**
   * 把 PDF 二进制写入本地缓存，使该论文可在断网时阅读。
   * Blob 永不出本地（不 pushToCloud），与「Dexie 单一真相源」一致。
   */
  async cachePdfBlob(id: string, blob: Blob): Promise<void> {
    const existing = await paperDB.getById(id)
    if (!existing) return
    await paperDB.upsert({
      ...(existing as CachedPaper),
      pdfBlob: blob,
      cachedAt: new Date().toISOString(),
    })
  },

  // ────────────────────────────────────────────────────────
  // 标注
  // ────────────────────────────────────────────────────────

  async listAnnotations(paperId: string): Promise<Annotation[]> {
    const list = await annotationDB.getByPaperId(paperId)
    return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
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
    pushToCloud('/api/annotations', 'POST', annotation)
    return annotation
  },

  async updateAnnotation(
    id: string,
    patch: Partial<Pick<Annotation, 'type' | 'color' | 'comment' | 'aiSummary'>>,
  ): Promise<void> {
    await annotationDB.update(id, { ...patch, updatedAt: new Date().toISOString() })
    pushToCloud('/api/annotations', 'PUT', { id, ...patch })
  },

  async deleteAnnotation(id: string): Promise<void> {
    await annotationDB.delete(id)
    pushToCloud(`/api/annotations?id=${id}`, 'DELETE')
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
    pushToCloud('/api/research-notes', 'POST', { paperId, content })
    return note
  },

  // ────────────────────────────────────────────────────────
  // 阅读进度
  // ────────────────────────────────────────────────────────

  async getProgress(paperId: string) {
    return progressDB.getByPaperId(paperId)
  },

  async saveProgress(paperId: string, currentPage: number, totalPages: number) {
    return progressDB.update(paperId, currentPage, totalPages)
  },
}

/** 去掉 Blob 字段，返回可安全 JSON 化的纯 Paper */
function stripBlob(p: CachedPaper): Paper {
  const { pdfBlob: _pdfBlob, cachedAt: _cachedAt, ...rest } = p
  void _pdfBlob
  void _cachedAt
  return rest
}

export default repository
