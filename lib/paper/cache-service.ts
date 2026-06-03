/**
 * 论文本地缓存服务 - 使用 Dexie (IndexedDB)
 */

import { db, paperDB, annotationDB, noteDB, type CachedPaper } from '@/lib/db/local-db'

/**
 * 获取所有缓存的论文
 */
export async function getCachedPapers(): Promise<CachedPaper[]> {
  try {
    return await paperDB.getAll()
  } catch (error) {
    console.error('Failed to get cached papers:', error)
    return []
  }
}

/**
 * 缓存单篇论文
 */
export async function cachePaper(paper: CachedPaper): Promise<void> {
  try {
    await paperDB.upsert({
      ...paper,
      cachedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to cache paper:', error)
  }
}

/**
 * 检查论文是否已缓存
 */
export async function isPaperCached(arxivId?: string, id?: string): Promise<boolean> {
  try {
    if (arxivId) {
      const paper = await paperDB.getByArxivId(arxivId)
      return !!paper
    }
    if (id) {
      return await paperDB.exists(id)
    }
    return false
  } catch (error) {
    console.error('Failed to check if paper is cached:', error)
    return false
  }
}

/**
 * 获取缓存的论文详情
 */
export async function getCachedPaper(arxivId?: string, id?: string): Promise<CachedPaper | undefined> {
  try {
    if (arxivId) {
      return await paperDB.getByArxivId(arxivId)
    }
    if (id) {
      return await paperDB.getById(id)
    }
    return undefined
  } catch (error) {
    console.error('Failed to get cached paper:', error)
    return undefined
  }
}

/**
 * 删除缓存的论文
 */
export async function removeCachedPaper(id: string): Promise<void> {
  try {
    await paperDB.delete(id)
  } catch (error) {
    console.error('Failed to remove cached paper:', error)
  }
}

/**
 * 搜索论文
 */
export async function searchCachedPapers(query: string): Promise<CachedPaper[]> {
  try {
    return await paperDB.search(query)
  } catch (error) {
    console.error('Failed to search cached papers:', error)
    return []
  }
}
