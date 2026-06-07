import { NextResponse } from 'next/server';
import { searchPapers } from '@/lib/paper-search/search-service';
import type { SearchQuery } from '@/lib/paper-search/types';

export async function POST(request: Request) {
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

    const { results, failedSources } = await searchPapers(query, sources, apiKeys);

    return NextResponse.json({ success: true, data: results, failedSources });
  } catch (error) {
    console.error('[Search API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '搜索失败',
        details: error instanceof Error ? error.message : String(error) 
      }, 
      { status: 500 }
    );
  }
}
