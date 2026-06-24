import { NextResponse } from 'next/server';
import { searchPapers, searchPapersExpanded } from '@/lib/paper-search/search-service';
import { expandQuery } from '@/lib/paper-search/query-expand';
import { llmRerankTopK } from '@/lib/paper-search/llm-rerank';
import { cacheKey, queryLabel, getCached, putCached } from '@/lib/paper-search/cache';
import { resolveKeys, hasAnyKey } from '@/lib/ai/keys';
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
      maxResults: Math.min(Math.max(Number(body.maxResults) || 50, 1), 100),
      sortBy: body.sortBy || 'relevance',
    };

    // 默认源：arXiv 优先（可打开主源）+ Semantic Scholar（带直链 PDF、覆盖全学科最新）；
    // OpenAlex 保留但靠后（综合排序里降权，纯 OpenAlex 期刊论文常打不开）。
    const sources = body.sources || ['arxiv', 'semantic-scholar', 'openalex', 'crossref'];
    const apiKeys = body.apiKeys;

    // 查询扩展（Perplexity 式 fan-out）：默认开启，可由 body.expand=false 关闭。
    // 无 AI key 时 expandQuery 自动降级为单查询，等价于普通检索。
    const keys = resolveKeys(request);
    const wantExpand = body.expand !== false && hasAnyKey(keys);
    const subqueries = wantExpand ? await expandQuery(query, keys) : [];
    const expanded = subqueries.length > 1;

    // LLM 精排：默认关（body.llmRerank=true 才开），仅相关性模式有意义，需 key
    const wantRerank =
      body.llmRerank === true &&
      hasAnyKey(keys) &&
      (query.sortBy ?? 'relevance') === 'relevance';

    // ── 缓存层（配了 Supabase service-role 才启用，否则全程降级直连上游）──
    // 不同处理路径用哨兵区分缓存键，避免互相污染（扩展 / 精排各一枚）。
    const sentinels: string[] = [];
    if (expanded) sentinels.push('x:expand');
    if (wantRerank) sentinels.push('x:llmrerank');
    const key = cacheKey(query, [...sources, ...sentinels]);
    const cached = await getCached(key);
    if (cached) {
      logEvent({ route: 'paper-search', ok: true, ms: done(), meta: { cacheHit: true } });
      return NextResponse.json({
        success: true,
        data: cached.results.slice(0, query.maxResults),
        failedSources: cached.failedSources,
        expanded,
        subqueryCount: expanded ? subqueries.length : 0,
        reranked: wantRerank,
        cached: true,
      });
    }

    const outcome = expanded
      ? await searchPapersExpanded(query, sources, subqueries, apiKeys)
      : await searchPapers(query, sources, apiKeys);
    const failedSources = outcome.failedSources;
    // 精排前若上游全失败则跳过（无可排内容）；失败一律原样返回（llmRerankTopK 内已守）
    const results = wantRerank
      ? await llmRerankTopK(outcome.results, query, keys)
      : outcome.results;

    // 回写缓存：best-effort，不 await 也行，但 await 保证落库（serverless 下进程随响应结束）
    await putCached(key, queryLabel(query), results, failedSources);

    logEvent({ route: 'paper-search', ok: true, ms: done(), meta: { cacheHit: false, results: results.length, expanded, reranked: wantRerank } });
    return NextResponse.json({
      success: true,
      data: results,
      failedSources,
      expanded,
      subqueryCount: expanded ? subqueries.length : 0,
      reranked: wantRerank,
      cached: false,
    });
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
