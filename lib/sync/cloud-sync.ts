/**
 * 云端同步 —— 把本地 Dexie 的论文库镜像到 Supabase（Postgres + RLS 行级隔离）。
 *
 * 模型：本地 Dexie 仍是「即时真相源」（写本地零延迟、可离线）；登录后每次写操作
 * best-effort 推到 Supabase（带 user_id，RLS 保证只能读写自己的行）；登录瞬间从
 * Supabase 拉全量合并进本地 → 实现「跨设备 / 换浏览器 / 清缓存不丢」。
 *
 * 未登录或未配置 Supabase 时全部 no-op，退回纯本地模式。
 * 注意：PDF 二进制 Blob 不入库（太大），仅同步元数据；换设备时 arXiv 论文经 pdf-proxy
 * 重新拉取，本地上传的 PDF 需在原设备重新缓存（v1 限制）。
 */

import { getSupabase } from '@/lib/supabase/client'
import { db } from '@/lib/db/local-db'
import type { Paper, Annotation, ResearchNote } from '@/lib/db/types'

/** 本地库发生变化（拉取合并后）时派发，页面据此刷新 */
export const LIBRARY_CHANGED_EVENT = 'paperweave:library-changed'

let currentUserId: string | null = null

/** 由 AuthProvider 在登录/登出时调用，更新当前同步用户 */
export function setSyncUser(id: string | null): void {
  currentUserId = id
}

export function getSyncUserId(): string | null {
  return currentUserId
}

function client() {
  if (!currentUserId) return null
  return getSupabase()
}

// ── 类型映射：Dexie(camelCase) ↔ Supabase 行(snake_case) ──────────────

function paperToRow(p: Paper, userId: string) {
  return {
    id: p.id,
    user_id: userId,
    arxiv_id: p.arxivId ?? null,
    title: p.title,
    abstract: p.abstract ?? null,
    authors: p.authors ?? [],
    source_type: p.sourceType,
    source_url: p.sourceUrl ?? null,
    pdf_path: p.pdfPath ?? null,
    published_at: p.publishedAt ?? null,
    tags: p.tags ?? [],
    direction: p.direction ?? null,
    notes: p.notes ?? null,
    summary: p.summary ?? null,
    methodology: p.methodology ?? null,
    contribution: p.contribution ?? null,
    citations: p.citations ?? 0,
    created_at: p.createdAt,
    updated_at: p.updatedAt ?? new Date().toISOString(),
  }
}

type PaperRow = ReturnType<typeof paperToRow>

function rowToPaper(r: PaperRow): Paper {
  return {
    id: r.id,
    arxivId: r.arxiv_id ?? undefined,
    title: r.title,
    abstract: r.abstract ?? undefined,
    authors: (r.authors as Paper['authors']) ?? [],
    sourceType: r.source_type as Paper['sourceType'],
    sourceUrl: r.source_url ?? undefined,
    pdfPath: r.pdf_path ?? undefined,
    publishedAt: r.published_at ?? undefined,
    tags: (r.tags as string[]) ?? [],
    direction: r.direction ?? undefined,
    notes: r.notes ?? undefined,
    summary: r.summary ?? undefined,
    methodology: r.methodology ?? undefined,
    contribution: r.contribution ?? undefined,
    citations: typeof r.citations === 'number' ? r.citations : 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? undefined,
  }
}

function annotationToRow(a: Annotation, userId: string) {
  return {
    id: a.id,
    user_id: userId,
    paper_id: a.paperId,
    page: a.page,
    rects: a.rects ?? [],
    selected_text: a.selectedText ?? '',
    type: a.type,
    color: a.color,
    comment: a.comment ?? null,
    ai_summary: (a.aiSummary as object) ?? null,
    created_at: a.createdAt,
    updated_at: a.updatedAt ?? new Date().toISOString(),
  }
}

type AnnotationRow = ReturnType<typeof annotationToRow>

function rowToAnnotation(r: AnnotationRow): Annotation {
  return {
    id: r.id,
    paperId: r.paper_id,
    page: r.page,
    rects: (r.rects as Annotation['rects']) ?? [],
    selectedText: r.selected_text ?? '',
    type: r.type as Annotation['type'],
    color: r.color,
    comment: r.comment ?? undefined,
    aiSummary: r.ai_summary ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? undefined,
  }
}

function noteToRow(n: ResearchNote, userId: string) {
  return {
    id: n.id,
    user_id: userId,
    paper_id: n.paperId,
    title: n.title ?? null,
    content: n.content,
    created_at: n.createdAt,
    updated_at: n.updatedAt,
  }
}

type NoteRow = ReturnType<typeof noteToRow>

function rowToNote(r: NoteRow): ResearchNote {
  return {
    id: r.id,
    paperId: r.paper_id,
    title: r.title ?? undefined,
    content: r.content,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

// ── 推送（写操作后 best-effort，失败只告警不影响本地） ────────────────

// Supabase 查询构造器是 thenable（PromiseLike），await 后得到 { error }
async function safe(label: string, fn: () => PromiseLike<{ error: unknown }>) {
  try {
    const { error } = await fn()
    if (error) {
      console.warn(`[cloud-sync] ${label} 失败（已忽略，本地为准）:`, error)
    }
  } catch (e) {
    console.warn(`[cloud-sync] ${label} 异常（已忽略）:`, e)
  }
}

export const cloudSync = {
  async pushPaper(p: Paper) {
    const sb = client()
    if (!sb) return
    await safe('pushPaper', () => sb.from('papers').upsert(paperToRow(p, currentUserId!)))
  },

  async deletePaper(id: string) {
    const sb = client()
    if (!sb) return
    // 标注/笔记/进度设了 ON DELETE CASCADE（见 supabase/schema.sql），删论文即级联
    await safe('deletePaper', () => sb.from('papers').delete().eq('id', id))
  },

  async pushAnnotation(a: Annotation) {
    const sb = client()
    if (!sb) return
    await safe('pushAnnotation', () => sb.from('annotations').upsert(annotationToRow(a, currentUserId!)))
  },

  async deleteAnnotation(id: string) {
    const sb = client()
    if (!sb) return
    await safe('deleteAnnotation', () => sb.from('annotations').delete().eq('id', id))
  },

  async pushNote(n: ResearchNote) {
    const sb = client()
    if (!sb) return
    await safe('pushNote', () => sb.from('research_notes').upsert(noteToRow(n, currentUserId!)))
  },

  async pushProgress(paperId: string, currentPage: number, totalPages: number) {
    const sb = client()
    if (!sb) return
    await safe('pushProgress', () =>
      sb.from('read_progress').upsert(
        {
          id: `progress-${paperId}`,
          user_id: currentUserId!,
          paper_id: paperId,
          current_page: currentPage,
          total_pages: totalPages,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      ),
    )
  },

  /**
   * 登录后拉全量并合并进本地 Dexie：
   * - 论文：以 updated_at 较新者为准；保留本地已有的 pdfBlob。
   * - 标注 / 笔记 / 进度：直接 upsert。
   * 完成后派发 LIBRARY_CHANGED_EVENT，页面据此刷新。
   */
  async pullAll(): Promise<void> {
    const sb = client()
    if (!sb) return

    const [papers, annotations, notes, progress] = await Promise.all([
      sb.from('papers').select('*'),
      sb.from('annotations').select('*'),
      sb.from('research_notes').select('*'),
      sb.from('read_progress').select('*'),
    ])

    if (!papers.error && papers.data) {
      for (const row of papers.data as PaperRow[]) {
        const remote = rowToPaper(row)
        const local = await db.papers.get(remote.id)
        // 远端较新（或本地没有）才覆盖；始终保留本地 pdfBlob
        const remoteNewer =
          !local ||
          (remote.updatedAt ?? '') >= (local.updatedAt ?? local.createdAt ?? '')
        if (remoteNewer) {
          await db.papers.put({
            ...remote,
            pdfBlob: local?.pdfBlob,
            cachedAt: local?.cachedAt ?? new Date().toISOString(),
          })
        }
      }
    }

    if (!annotations.error && annotations.data) {
      for (const row of annotations.data as AnnotationRow[]) {
        await db.annotations.put(rowToAnnotation(row))
      }
    }

    if (!notes.error && notes.data) {
      for (const row of notes.data as NoteRow[]) {
        await db.notes.put(rowToNote(row))
      }
    }

    if (!progress.error && progress.data) {
      for (const row of progress.data as Array<Record<string, unknown>>) {
        await db.readProgress.put({
          id: String(row.id),
          paperId: String(row.paper_id),
          currentPage: Number(row.current_page) || 1,
          totalPages: Number(row.total_pages) || 0,
          lastReadAt: String(row.last_read_at ?? new Date().toISOString()),
        })
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(LIBRARY_CHANGED_EVENT))
    }
  },

  /**
   * 首次登录把本地已有论文库整体上推到云端（让登录前攒的本地数据归属到账号）。
   * 用 upsert，重复登录不会产生重复。
   */
  async pushAllLocal(): Promise<void> {
    const sb = client()
    if (!sb) return
    const uid = currentUserId!

    const [papers, annotations, notes, progress] = await Promise.all([
      db.papers.toArray(),
      db.annotations.toArray(),
      db.notes.toArray(),
      db.readProgress.toArray(),
    ])

    if (papers.length) {
      await safe('pushAllLocal/papers', () =>
        sb.from('papers').upsert(papers.map((p) => paperToRow(p, uid))),
      )
    }
    if (annotations.length) {
      await safe('pushAllLocal/annotations', () =>
        sb.from('annotations').upsert(annotations.map((a) => annotationToRow(a, uid))),
      )
    }
    if (notes.length) {
      await safe('pushAllLocal/notes', () =>
        sb.from('research_notes').upsert(notes.map((n) => noteToRow(n, uid))),
      )
    }
    if (progress.length) {
      await safe('pushAllLocal/progress', () =>
        sb.from('read_progress').upsert(
          progress.map((r) => ({
            id: r.id,
            user_id: uid,
            paper_id: r.paperId,
            current_page: r.currentPage,
            total_pages: r.totalPages,
            last_read_at: r.lastReadAt,
          })),
          { onConflict: 'id' },
        ),
      )
    }
  },
}
