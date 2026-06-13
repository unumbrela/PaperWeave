/**
 * 检索结果缓存层 —— 把上游（OpenAlex / arXiv / …）的检索结果落到 Postgres，
 * 命中即直接返回并累加热度，未命中查上游后回写。
 *
 * 两条铁律：
 * 1. **best-effort**：缓存读写任何失败都吞掉，绝不拖累检索本身（上游照常返回）。
 * 2. **零配置降级**：未配 service-role（getServiceSupabase()===null）时全部转空操作。
 *
 * `cacheKey` 是纯函数（不依赖 Supabase），单测对它的稳定性/归一化盖章。
 */

import { createHash } from 'node:crypto';
import { getServiceSupabase } from '@/lib/supabase/server';
import type { SearchQuery, PaperResult } from './types';

/** 缓存有效期：14 天（学术检索结果变化慢，命中率优先）。 */
export const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * 「部分源失败」的降级有效期：10 分钟。
 * 残缺结果只短暂缓存，上游恢复后很快能拿到完整结果，
 * 避免一次 arXiv 抽风把"只有 OpenAlex"的快照钉死 14 天。
 */
export const DEGRADED_TTL_MS = 10 * 60 * 1000;

/**
 * 由「查询 + 检索源」算出稳定的缓存键。
 * 归一化要点：去掉随次数变化的字段（maxResults 不进 key，键稳定才能跨不同条数命中）、
 * 字符串去首尾空白并小写、source 排序，保证「同义查询同键」。
 */
export function cacheKey(query: SearchQuery, sources: string[]): string {
  const norm = (s?: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const payload = {
    field: norm(query.field),
    keywords: norm(query.keywords),
    mustHave: norm(query.mustHaveKeywords),
    exclude: norm(query.excludeKeywords),
    goal: norm(query.researchGoal),
    method: norm(query.methodHints),
    startYear: query.startYear ?? null,
    endYear: query.endYear ?? null,
    venues: [...(query.venues || [])].map(norm).sort(),
    sortBy: query.sortBy || 'relevance',
    sources: [...sources].sort(),
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

/** 人类可读的查询摘要（用于「热门检索」展示），优先关键词、退化到领域。 */
export function queryLabel(query: SearchQuery): string {
  const parts = [query.keywords, query.researchGoal, query.field]
    .map((s) => (s || '').trim())
    .filter(Boolean);
  return parts.join(' · ').slice(0, 120) || '(空查询)';
}

interface CacheRow {
  query_hash: string;
  label: string;
  results: PaperResult[];
  failed_sources: string[];
  hit_count: number;
  expires_at: string;
}

/** 命中且未过期则返回结果，并异步 +1 热度；未配置 / 未命中 / 过期 / 出错都返回 null。 */
export async function getCached(
  key: string,
): Promise<{ results: PaperResult[]; failedSources: string[] } | null> {
  const db = getServiceSupabase();
  if (!db) return null;
  try {
    const { data, error } = await db
      .from('search_cache')
      .select('results, failed_sources, expires_at')
      .eq('query_hash', key)
      .maybeSingle();
    if (error || !data) return null;
    if (new Date(data.expires_at).getTime() < Date.now()) return null;

    // 热度 +1：fire-and-forget，不 await，不影响响应延迟
    db.rpc('increment_search_hit', { p_query_hash: key }).then(
      () => {},
      () => {},
    );

    return {
      results: (data.results as PaperResult[]) || [],
      failedSources: (data.failed_sources as string[]) || [],
    };
  } catch {
    return null;
  }
}

/** 回写缓存（upsert）。best-effort，失败静默。 */
export async function putCached(
  key: string,
  label: string,
  results: PaperResult[],
  failedSources: string[],
): Promise<void> {
  const db = getServiceSupabase();
  if (!db) return;
  // 上游整体失败（0 结果且有失败源）不缓存，避免把"空"钉死 14 天
  if (results.length === 0 && failedSources.length > 0) return;
  // 部分源失败：结果残缺，只缓存 10 分钟；全源成功才缓存 14 天
  const ttl = failedSources.length > 0 ? DEGRADED_TTL_MS : CACHE_TTL_MS;
  try {
    const row: Partial<CacheRow> = {
      query_hash: key,
      label,
      results,
      failed_sources: failedSources,
      expires_at: new Date(Date.now() + ttl).toISOString(),
    };
    await db.from('search_cache').upsert(row, { onConflict: 'query_hash' });
  } catch {
    /* 缓存失败不影响检索 */
  }
}

export interface HotQuery {
  label: string;
  hits: number;
  count: number;
}

/** 返回热门检索词（按命中次数降序）。未配置 / 出错返回空数组（UI 据此隐藏该区）。 */
export async function listHotQueries(limit = 8): Promise<HotQuery[]> {
  const db = getServiceSupabase();
  if (!db) return [];
  try {
    const { data, error } = await db
      .from('search_cache')
      .select('label, hit_count, results')
      .order('hit_count', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data
      .filter((r) => (r.label as string)?.trim() && (r.label as string) !== '(空查询)')
      .map((r) => ({
        label: r.label as string,
        hits: (r.hit_count as number) || 0,
        count: Array.isArray(r.results) ? (r.results as unknown[]).length : 0,
      }));
  } catch {
    return [];
  }
}
