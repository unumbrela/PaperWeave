import type { SearchQuery, PaperResult } from './types';

function getFieldKeywords(field?: string) {
  const fieldMap: Record<string, string> = {
    'medical-imaging': 'medical image segmentation',
    'diffusion-models': 'diffusion models',
    'contrastive-learning': 'contrastive learning',
    mamba: 'mamba state space model',
    llm: 'large language model LLM',
    'computer-vision': 'computer vision',
    nlp: 'natural language processing NLP',
    'reinforcement-learning': 'reinforcement learning',
    'graph-neural-networks': 'graph neural networks GNN',
    transformers: 'transformer attention mechanism',
  };
  return field ? fieldMap[field] || '' : '';
}

export function buildKeywordQuery(query: SearchQuery) {
  return [
    query.keywords,
    getFieldKeywords(query.field),
    query.mustHaveKeywords,
    query.researchGoal,
    query.methodHints,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function shouldKeepPaper(paper: PaperResult, query: SearchQuery) {
  const haystack = `${paper.title} ${paper.abstract || ''} ${paper.authors.join(' ')} ${paper.venue || ''}`.toLowerCase();

  const mustHave = query.mustHaveKeywords
    ?.split(/[,，;；]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (mustHave?.length && !mustHave.every((keyword) => haystack.includes(keyword))) {
    return false;
  }

  const excludes = query.excludeKeywords
    ?.split(/[,，;；]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (excludes?.some((keyword) => haystack.includes(keyword))) {
    return false;
  }

  return true;
}

export function restoreOpenAlexAbstract(index?: Record<string, number[]>) {
  if (!index) return undefined;
  const words: Array<{ word: string; position: number }> = [];
  for (const [word, positions] of Object.entries(index)) {
    positions.forEach((position) => words.push({ word, position }));
  }
  return words
    .sort((a, b) => a.position - b.position)
    .map((item) => item.word)
    .join(' ');
}

export async function searchOpenAlex(query: SearchQuery): Promise<PaperResult[]> {
  const results: PaperResult[] = [];
  
  try {
    console.log('[OpenAlex Search] Query:', query);
    let url = 'https://api.openalex.org/works?per-page=20';
    
    const filters: string[] = [];
    
    const keywordQuery = buildKeywordQuery(query);

    if (keywordQuery) {
      url += `&search=${encodeURIComponent(keywordQuery)}`;
    }
    
    if (query.startYear) {
      filters.push(`publication_year:>${query.startYear}`);
    }
    
    if (query.endYear) {
      filters.push(`publication_year:<${query.endYear}`);
    }
    
    if (query.venues && query.venues.length > 0) {
      const venueFilter = query.venues.map(v => `primary_location.source.display_name.search:${v}`).join('|');
      filters.push(`(${venueFilter})`);
    }
    
    if (filters.length > 0) {
      url += `&filter=${filters.join(',')}`;
    }
    
    console.log('[OpenAlex Search] URL:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenAlex API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[OpenAlex Search] Results count:', data.results?.length || 0);
    
    if (data.results) {
      for (const work of data.results.slice(0, query.maxResults || 20)) {
        results.push({
          id: work.id?.replace('https://openalex.org/', '') || `openalex-${work.id}`,
          title: work.title,
          authors: work.authorships?.map((a: { author?: { display_name?: string } }) => a.author?.display_name).filter(Boolean) || [],
          year: work.publication_year,
          // OpenAlex 的刊名在 primary_location.source.display_name（旧 host_venue 已废弃；work.venue 不存在）
          venue: work.primary_location?.source?.display_name,
          url: work.id,
          pdfUrl: work.open_access?.oa_url,
          abstract: work.abstract || restoreOpenAlexAbstract(work.abstract_inverted_index),
          citations: work.cited_by_count,
          source: 'openalex',
        });
      }
    }
  } catch (error) {
    console.error('OpenAlex search failed:', error);
    throw error;
  }
  
  return results;
}

export async function searchArXiv(query: SearchQuery): Promise<PaperResult[]> {
  const results: PaperResult[] = [];
  
  try {
    console.log('[arXiv Search] Query:', query);
    
    let searchQuery = '';
    
    const keywordQuery = buildKeywordQuery(query);

    if (keywordQuery) {
      searchQuery += `all:${encodeURIComponent(keywordQuery)}`;
    }
    
    if (query.field) {
      const fieldMap: Record<string, string> = {
        'computer-vision': 'cs.CV',
        'nlp': 'cs.CL',
        'llm': 'cs.CL',
        'reinforcement-learning': 'cs.LG',
        'diffusion-models': 'cs.CV',
        'contrastive-learning': 'cs.LG',
        'graph-neural-networks': 'cs.LG',
        'transformers': 'cs.LG',
        'mamba': 'cs.LG',
        'medical-imaging': 'cs.CV',
      };
      const cat = fieldMap[query.field];
      if (cat) {
        if (searchQuery) searchQuery += '+AND+';
        searchQuery += `cat:${cat}`;
      }
    }
    
    if (!searchQuery) {
      console.log('[arXiv Search] No search terms provided, skipping');
      return results;
    }
    
    // arXiv 的 sortBy 仅支持 relevance / lastUpdatedDate / submittedDate；
    // sortOrder 只接受 ascending / descending（传 "desc" 会被 arXiv 直接 400）。
    const arxivSortBy = query.sortBy === 'year' ? 'submittedDate' : query.sortBy === 'relevance' ? 'relevance' : 'submittedDate';
    const url = `https://export.arxiv.org/api/query?search_query=${searchQuery}&max_results=${query.maxResults || 20}&sortBy=${arxivSortBy}&sortOrder=descending`;
    console.log('[arXiv Search] URL:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; PaperWeave/1.0; +https://github.com/unumbrela/toolbox)',
      },
    });
    if (!response.ok) {
      throw new Error(`arXiv API error: ${response.status}`);
    }
    
    const text = await response.text();
    console.log('[arXiv Search] Response received');
    
    const extractBetween = (str: string, start: string, end: string) => {
      const startIndex = str.indexOf(start);
      if (startIndex === -1) return null;
      const contentStart = startIndex + start.length;
      const endIndex = str.indexOf(end, contentStart);
      if (endIndex === -1) return null;
      return str.substring(contentStart, endIndex);
    };
    
    const extractAllEntries = (xml: string) => {
      const entries: string[] = [];
      let currentIndex = 0;
      while (true) {
        const entryStart = xml.indexOf('<entry>', currentIndex);
        if (entryStart === -1) break;
        const entryEnd = xml.indexOf('</entry>', entryStart);
        if (entryEnd === -1) break;
        entries.push(xml.substring(entryStart + '<entry>'.length, entryEnd));
        currentIndex = entryEnd + '</entry>'.length;
      }
      return entries;
    };
    
    const entries = extractAllEntries(text);
    console.log('[arXiv Search] Found entries:', entries.length);
    
    for (const entry of entries) {
      const id = extractBetween(entry, '<id>', '</id>')?.replace('http://arxiv.org/abs/', '') || '';
      const title = extractBetween(entry, '<title>', '</title>')?.trim() || '';
      const summary = extractBetween(entry, '<summary>', '</summary>')?.trim() || '';
      const published = extractBetween(entry, '<published>', '</published>') || '';
      const year = published ? parseInt(published.substring(0, 4)) : undefined;
      
      const authors: string[] = [];
      let authorIndex = 0;
      while (true) {
        const authorStart = entry.indexOf('<author>', authorIndex);
        if (authorStart === -1) break;
        const authorEnd = entry.indexOf('</author>', authorStart);
        if (authorEnd === -1) break;
        const authorTag = entry.substring(authorStart, authorEnd);
        const name = extractBetween(authorTag, '<name>', '</name>');
        if (name) authors.push(name);
        authorIndex = authorEnd + '</author>'.length;
      }
      
      let pdfUrl: string | undefined;
      const linkStart = entry.indexOf('link title="pdf"', 0);
      if (linkStart !== -1) {
        const hrefStart = entry.indexOf('href="', linkStart);
        if (hrefStart !== -1) {
          const hrefEnd = entry.indexOf('"', hrefStart + 6);
          if (hrefEnd !== -1) {
            pdfUrl = entry.substring(hrefStart + 6, hrefEnd);
          }
        }
      }
      
      results.push({
        id,
        title,
        authors,
        year,
        url: `https://arxiv.org/abs/${id}`,
        pdfUrl: pdfUrl,
        abstract: summary,
        source: 'arxiv',
      });
    }
  } catch (error) {
    console.error('arXiv search failed:', error);
    throw error;
  }
  
  return results;
}

export async function searchSemanticScholar(query: SearchQuery, apiKey?: string): Promise<PaperResult[]> {
  const results: PaperResult[] = [];
  
  try {
    console.log('[Semantic Scholar Search] Query:', query);
    
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    
    const params = new URLSearchParams();
    params.set('query', buildKeywordQuery(query));
    params.set('limit', String(query.maxResults || 20));
    
    if (query.startYear) {
      params.set('year', `>${query.startYear}`);
    }
    
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?${params.toString()}`;
    console.log('[Semantic Scholar Search] URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      throw new Error(`Semantic Scholar API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[Semantic Scholar Search] Results count:', data.data?.length || 0);
    
    if (data.data) {
      for (const paper of data.data) {
        results.push({
          id: paper.paperId,
          title: paper.title,
          authors: paper.authors?.map((a: { name?: string }) => a.name) || [],
          year: paper.year,
          venue: paper.venue,
          url: `https://www.semanticscholar.org/paper/${paper.paperId}`,
          pdfUrl: paper.openAccessPdf?.url,
          abstract: paper.abstract,
          citations: paper.citationCount,
          source: 'semantic-scholar',
        });
      }
    }
  } catch (error) {
    console.error('Semantic Scholar search failed:', error);
    throw error;
  }
  
  return results;
}

export interface SearchOutcome {
  results: PaperResult[];
  /** 未成功返回的检索源（网络/接口错误）；单源失败不影响其余源 */
  failedSources: string[];
}

const SOURCE_LABELS: Record<string, string> = {
  openalex: 'OpenAlex',
  arxiv: 'arXiv',
  'semantic-scholar': 'Semantic Scholar',
};

export async function searchPapers(
  query: SearchQuery,
  sources: string[],
  apiKeys?: Record<string, string>,
): Promise<SearchOutcome> {
  console.log('[searchPapers] Starting search with sources:', sources);

  const allResults: PaperResult[] = [];
  const failedSources: string[] = [];
  const labeled: Array<{ source: string; task: Promise<PaperResult[]> }> = [];

  if (sources.includes('openalex')) {
    labeled.push({ source: 'openalex', task: searchOpenAlex(query) });
  }
  if (sources.includes('arxiv')) {
    labeled.push({ source: 'arxiv', task: searchArXiv(query) });
  }
  if (sources.includes('semantic-scholar')) {
    labeled.push({ source: 'semantic-scholar', task: searchSemanticScholar(query, apiKeys?.['semantic-scholar']) });
  }

  if (labeled.length === 0) {
    console.log('[searchPapers] No sources selected');
    return { results: [], failedSources: [] };
  }

  // allSettled：任一源失败只记录该源，已成功的源照常返回结果
  const settled = await Promise.allSettled(labeled.map((l) => l.task));
  settled.forEach((outcome, i) => {
    if (outcome.status === 'fulfilled') {
      allResults.push(...outcome.value);
    } else {
      failedSources.push(SOURCE_LABELS[labeled[i].source] || labeled[i].source);
    }
  });

  console.log('[searchPapers] Total results before dedupe:', allResults.length);
  
  const seen = new Set<string>();
  const uniqueResults = allResults.filter(paper => {
    const key = `${paper.title}-${paper.authors.join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  const filteredResults = uniqueResults.filter((paper) => shouldKeepPaper(paper, query));

  filteredResults.sort((a, b) => {
    if (query.sortBy === 'year') {
      return (b.year || 0) - (a.year || 0);
    }
    if (query.sortBy === 'citations' && b.citations && a.citations) {
      return b.citations - a.citations;
    }
    if (b.citations && a.citations) return b.citations - a.citations;
    if (b.year || a.year) return (b.year || 0) - (a.year || 0);
    return 0;
  });
  
  const finalResults = filteredResults.slice(0, query.maxResults || 50);
  console.log('[searchPapers] Final results:', finalResults.length, 'failed sources:', failedSources);

  return { results: finalResults, failedSources };
}
