import { NextResponse } from 'next/server';
import { searchPapers } from '@/lib/paper-search/search-service';
import { cacheKey, queryLabel, getCached, putCached } from '@/lib/paper-search/cache';
import { enforceRateLimit } from '@/lib/api/http';
import { logEvent, startTimer } from '@/lib/api/log';
import type { SearchQuery } from '@/lib/paper-search/types';

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, 'search', { windowMs: 60_000, max: 30 });
  if (limited) return limited;

  const done = startTimer();
  try {
    const body = await request.json();

    const query: SearchQuery = {
      field: body.field,
      keywords: body.keywords,
      mustHaveKeywords: body.mustHaveKeywords,
      excludeKeywords: body.excludeKeywords,
      researchGoal: body.researchGoal,
      methodHints: body.methodHints,
      startYear: body.startYear,
      endYear: body.endYear,
      venues: body.venues,
      // 夹上限：防止构造大值放大上游与内存开销（各上游另有自身上限）
      maxResults: Math.min(Math.max(Number(body.maxResults) || 30, 1), 100),
      sortBy: body.sortBy || 'relevance',
    };

    const sources = body.sources || ['openalex', 'arxiv'];
    const apiKeys = body.apiKeys;

    // ── 缓存层（配了 Supabase service-role 才启用，否则全程降级直连上游）──
    const key = cacheKey(query, sources);
    const cached = await getCached(key);
    if (cached) {
      logEvent({ route: 'paper-search', ok: true, ms: done(), meta: { cacheHit: true } });
      return NextResponse.json({
        success: true,
        data: cached.results.slice(0, query.maxResults),
        failedSources: cached.failedSources,
        cached: true,
      });
    }

    const { results, failedSources } = await searchPapers(query, sources, apiKeys);

    // 回写缓存：best-effort，不 await 也行，但 await 保证落库（serverless 下进程随响应结束）
    await putCached(key, queryLabel(query), results, failedSources);

    logEvent({ route: 'paper-search', ok: true, ms: done(), meta: { cacheHit: false, results: results.length } });
    return NextResponse.json({ success: true, data: results, failedSources, cached: false });
  } catch (error) {
    console.error('[Search API] Error:', error);
    logEvent({ route: 'paper-search', ok: false, ms: done(), status: 500 });
    return NextResponse.json(
      {
        success: false,
        error: '搜索失败',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
