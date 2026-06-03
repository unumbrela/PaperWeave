import { NextResponse } from 'next/server';
import { searchPapers } from '@/lib/paper-search/search-service';
import type { SearchQuery } from '@/lib/paper-search/types';

export async function POST(request: Request) {
  console.log('[Search API] Request received');
  
  try {
    const body = await request.json();
    console.log('[Search API] Request body:', body);
    
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
      maxResults: body.maxResults || 30,
      sortBy: body.sortBy || 'relevance',
    };
    
    const sources = body.sources || ['openalex', 'arxiv'];
    const apiKeys = body.apiKeys;
    
    console.log('[Search API] Searching with params:', { query, sources });
    
    const results = await searchPapers(query, sources, apiKeys);
    
    console.log('[Search API] Search complete, results:', results.length);
    
    return NextResponse.json({ success: true, data: results });
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
