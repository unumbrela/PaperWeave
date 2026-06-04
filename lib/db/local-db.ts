/**
 * 本地数据库服务 - 使用 Dexie (IndexedDB)
 * 
 * 优势：
 * - 支持大型数据存储（不只是字符串）
 * - 支持 Blob 存储（PDF 文件）
 * - 支持复杂查询
 * - 异步操作，性能更好
 */

import Dexie, { Table } from 'dexie'
import type { Paper, Annotation, ResearchNote } from './types'

export type { Paper, Annotation, ResearchNote, Author, Rect, AnnotationType, SourceType } from './types'

/**
 * 缓存论文接口 —— 在共享 `Paper` 上叠加本地特有字段（PDF Blob、缓存时间）
 */
export interface CachedPaper extends Paper {
  /** PDF 原始二进制，纯本地模式下离线可读 */
  pdfBlob?: Blob
  /** 写入本地缓存的时间 */
  cachedAt: string
}

/** 笔记接口 —— 即共享 `ResearchNote` */
export type Note = ResearchNote

/**
 * 阅读进度接口
 */
export interface ReadProgress {
  id: string
  paperId: string
  currentPage: number
  totalPages: number
  lastReadAt: string
}

/**
 * 数据库类
 */
class PaperDB extends Dexie {
  papers!: Table<CachedPaper>
  annotations!: Table<Annotation>
  notes!: Table<Note>
  readProgress!: Table<ReadProgress>

  constructor() {
    super('paper_workspace')
    
    this.version(1).stores({
      papers: 'id, arxivId, title, createdAt',
      annotations: 'id, paperId, page, createdAt',
      notes: 'id, paperId, updatedAt',
      readProgress: 'id, paperId, lastReadAt'
    })
  }
}

/**
 * 数据库实例
 */
export const db = new PaperDB()

/**
 * 论文操作函数
 */
export const paperDB = {
  /**
   * 获取所有论文
   */
  async getAll(): Promise<CachedPaper[]> {
    // 注意：cachedAt 不在 Dexie 索引里（schema 仅 id/arxivId/title/createdAt），
    // 不能用 orderBy('cachedAt')——那会抛 SchemaError。改为内存排序「最近缓存优先」。
    const all = await db.papers.toArray()
    return all.sort((a, b) => (b.cachedAt || '').localeCompare(a.cachedAt || ''))
  },

  /**
   * 根据 ID 获取论文
   */
  async getById(id: string): Promise<CachedPaper | undefined> {
    return await db.papers.get(id)
  },

  /**
   * 根据 arXiv ID 获取论文
   */
  async getByArxivId(arxivId: string): Promise<CachedPaper | undefined> {
    return await db.papers.where('arxivId').equals(arxivId).first()
  },

  /**
   * 添加或更新论文
   */
  async upsert(paper: CachedPaper): Promise<void> {
    await db.papers.put(paper)
  },

  /**
   * 删除论文（同时删除关联的标注和笔记）
   */
  async delete(id: string): Promise<void> {
    await db.transaction('rw', [db.papers, db.annotations, db.notes, db.readProgress], async () => {
      await db.papers.delete(id)
      await db.annotations.where('paperId').equals(id).delete()
      await db.notes.where('paperId').equals(id).delete()
      await db.readProgress.where('paperId').equals(id).delete()
    })
  },

  /**
   * 检查论文是否存在
   */
  async exists(id: string): Promise<boolean> {
    const count = await db.papers.where('id').equals(id).count()
    return count > 0
  },

  /**
   * 按标题搜索
   */
  async search(query: string): Promise<CachedPaper[]> {
    const lowerQuery = query.toLowerCase()
    return await db.papers
      .filter(paper => paper.title.toLowerCase().includes(lowerQuery))
      .toArray()
  }
}

/**
 * 标注操作函数
 */
export const annotationDB = {
  /**
   * 获取论文的所有标注
   */
  async getByPaperId(paperId: string): Promise<Annotation[]> {
    return await db.annotations.where('paperId').equals(paperId).toArray()
  },

  /**
   * 按 id 获取单条标注
   */
  async getById(id: string): Promise<Annotation | undefined> {
    return await db.annotations.get(id)
  },

  /**
   * 添加标注
   */
  async add(annotation: Annotation): Promise<void> {
    await db.annotations.add(annotation)
  },

  /**
   * 更新标注
   */
  async update(id: string, updates: Partial<Annotation>): Promise<void> {
    await db.annotations.update(id, updates)
  },

  /**
   * 删除标注
   */
  async delete(id: string): Promise<void> {
    await db.annotations.delete(id)
  },

  /**
   * 删除论文的所有标注
   */
  async deleteByPaperId(paperId: string): Promise<void> {
    await db.annotations.where('paperId').equals(paperId).delete()
  }
}

/**
 * 笔记操作函数
 */
export const noteDB = {
  /**
   * 获取论文的笔记
   */
  async getByPaperId(paperId: string): Promise<Note | undefined> {
    return await db.notes.where('paperId').equals(paperId).first()
  },

  /**
   * 创建或更新笔记
   */
  async upsert(note: Note): Promise<void> {
    await db.notes.put(note)
  },

  /**
   * 删除笔记
   */
  async delete(id: string): Promise<void> {
    await db.notes.delete(id)
  }
}

/**
 * 阅读进度操作函数
 */
export const progressDB = {
  /**
   * 获取论文的阅读进度
   */
  async getByPaperId(paperId: string): Promise<ReadProgress | undefined> {
    return await db.readProgress.where('paperId').equals(paperId).first()
  },

  /**
   * 更新阅读进度
   */
  async update(paperId: string, currentPage: number, totalPages: number): Promise<void> {
    const existing = await this.getByPaperId(paperId)
    
    if (existing) {
      await db.readProgress.update(existing.id, {
        currentPage,
        totalPages,
        lastReadAt: new Date().toISOString()
      })
    } else {
      await db.readProgress.add({
        id: `progress-${paperId}-${Date.now()}`,
        paperId,
        currentPage,
        totalPages,
        lastReadAt: new Date().toISOString()
      })
    }
  },

  /**
   * 获取最近阅读的论文
   */
  async getRecent(limit: number = 10): Promise<ReadProgress[]> {
    return await db.readProgress
      .orderBy('lastReadAt')
      .reverse()
      .limit(limit)
      .toArray()
  }
}
