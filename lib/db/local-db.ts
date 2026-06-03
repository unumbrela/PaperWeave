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

/**
 * 缓存论文接口
 */
export interface CachedPaper {
  id: string
  arxivId: string
  title: string
  abstract?: string
  authors?: { name: string; affiliation?: string }[]
  sourceType: 'ARXIV' | 'LOCAL' | 'DOI'
  sourceUrl?: string
  pdfPath?: string
  publishedAt?: string
  tags: string[]
  direction?: string
  notes?: string
  summary?: string
  methodology?: string
  contribution?: string
  citations: number
  pdfBlob?: Blob
  createdAt: string
  cachedAt: string
}

/**
 * 标注接口
 */
export interface Annotation {
  id: string
  paperId: string
  page: number
  rects: any
  selectedText: string
  type: 'highlight' | 'underline' | 'comment' | 'note' | 'bookmark'
  comment?: string
  color?: string
  createdAt: string
}

/**
 * 笔记接口
 */
export interface Note {
  id: string
  paperId: string
  title?: string
  content: string
  createdAt: string
  updatedAt: string
}

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
    return await db.papers.orderBy('cachedAt').reverse().toArray()
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
