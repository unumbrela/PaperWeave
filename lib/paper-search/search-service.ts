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
    // 每源请求量对齐 maxResults（跨源去重后还要截断，多要一点不亏）
    const perPage = Math.min(Math.max(query.maxResults || 30, 20), 100);
    let url = `https://api.openalex.org/works?per-page=${perPage}`;

    const filters: string[] = [];

    const keywordQuery = buildKeywordQuery(query);

    if (keywordQuery) {
      url += `&search=${encodeURIComponent(keywordQuery)}`;
    }

    // OpenAlex 的 > / < 是严格不等：要包含边界年必须 ±1
    //（此前 >2024 + <2026 把 2024 和 2026 都排掉了，只剩 2025）
    if (query.startYear) {
      filters.push(`publication_year:>${query.startYear - 1}`);
    }

    if (query.endYear) {
      filters.push(`publication_year:<${query.endYear + 1}`);
    }
    
    if (query.venues && query.venues.length > 0) {
      const venueFilter = query.venues.map(v => `primary_location.source.display_name.search:${v}`).join('|');
      filters.push(`(${venueFilter})`);
    }
    
    if (filters.length > 0) {
      url += `&filter=${filters.join(',')}`;
    }
    
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenAlex API error: ${response.status}`);
    }
    
    const data = await response.json();
    
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
      return results;
    }

    // 年份过滤：arXiv 用 submittedDate 范围子句（此前完全没实现，
    // 导致 arXiv 结果无视年份筛选）。方括号需 URL 编码，空格用 +。
    if (query.startYear || query.endYear) {
      const start = query.startYear || 1991; // arXiv 创立年
      const end = query.endYear || new Date().getFullYear();
      searchQuery += `+AND+submittedDate:%5B${start}01010000+TO+${end}12312359%5D`;
    }

    // arXiv 的 sortBy 仅支持 relevance / lastUpdatedDate / submittedDate；
    // sortOrder 只接受 ascending / descending（传 "desc" 会被 arXiv 直接 400）。
    const arxivSortBy = query.sortBy === 'year' ? 'submittedDate' : query.sortBy === 'relevance' ? 'relevance' : 'submittedDate';
    const url = `https://export.arxiv.org/api/query?search_query=${searchQuery}&max_results=${query.maxResults || 20}&sortBy=${arxivSortBy}&sortOrder=descending`;

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
    
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    
    const params = new URLSearchParams();
    params.set('query', buildKeywordQuery(query));
    params.set('limit', String(query.maxResults || 20));
    // 不带 fields 时 S2 只返回 paperId + title（摘要/引用数/年份全为空），必须显式声明
    params.set(
      'fields',
      'title,abstract,year,venue,citationCount,openAccessPdf,authors',
    );

    // S2 原生支持闭区间范围语法："2024-2026" / "2024-" / "-2026"
    if (query.startYear || query.endYear) {
      params.set('year', `${query.startYear || ''}-${query.endYear || ''}`);
    }

    const url = `https://api.semanticscholar.org/graph/v1/paper/search?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      throw new Error(`Semantic Scholar API error: ${response.status}`);
    }
    
    const data = await response.json();
    
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

/** 跨源去重键：归一化标题（小写、去非字母数字）。作者名各源格式不一，不进键。 */
export function normalizeTitleKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * 跨源合并：同一篇论文在多个源出现时合并为一条（而非丢弃后到的），
 * 保留先到源的身份字段，缺失字段从重复条目补齐——
 * 典型收益：OpenAlex 提供引用数，arXiv 提供稳定 PDF 链接。
 */
export function mergeDuplicates(results: PaperResult[]): PaperResult[] {
  const byKey = new Map<string, PaperResult>();
  for (const paper of results) {
    const key = normalizeTitleKey(paper.title);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...paper });
      continue;
    }
    if (existing.citations == null && paper.citations != null) existing.citations = paper.citations;
    if (!existing.pdfUrl && paper.pdfUrl) existing.pdfUrl = paper.pdfUrl;
    if (!existing.venue && paper.venue) existing.venue = paper.venue;
    if (!existing.abstract && paper.abstract) existing.abstract = paper.abstract;
    if (!existing.year && paper.year) existing.year = paper.year;
    if (existing.authors.length === 0 && paper.authors.length > 0) existing.authors = paper.authors;
  }
  return [...byKey.values()];
}

/**
 * 综合排序 = 按源交错（round-robin）：各源内部保持上游自己的相关性顺序，
 * 跨源轮流取，避免「有引用数的源整体压过没有引用数的源」。
 */
export function interleaveBySource(results: PaperResult[]): PaperResult[] {
  const groups = new Map<string, PaperResult[]>();
  for (const p of results) {
    const g = groups.get(p.source);
    if (g) g.push(p);
    else groups.set(p.source, [p]);
  }
  const queues = [...groups.values()];
  const out: PaperResult[] = [];
  for (let i = 0; out.length < results.length; i++) {
    for (const q of queues) {
      if (i < q.length) out.push(q[i]);
    }
  }
  return out;
}

/** 年份后置过滤：兜住上游忽略年份参数的情况；无年份字段的不误杀。 */
export function withinYearRange(paper: PaperResult, query: SearchQuery): boolean {
  if (!paper.year) return true;
  if (query.startYear && paper.year < query.startYear) return false;
  if (query.endYear && paper.year > query.endYear) return false;
  return true;
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

  
  // 跨源合并（同篇互补字段）→ 必含/排除词 + 年份后置过滤 → 按模式排序
  const merged = mergeDuplicates(allResults);
  const filteredResults = merged.filter(
    (paper) => shouldKeepPaper(paper, query) && withinYearRange(paper, query),
  );

  let sorted: PaperResult[];
  if (query.sortBy === 'citations') {
    // 被引降序；无引用数的排最后（而非被当作 0 混进去）
    sorted = [...filteredResults].sort(
      (a, b) => (b.citations ?? -1) - (a.citations ?? -1) || (b.year ?? 0) - (a.year ?? 0),
    );
  } else if (query.sortBy === 'year') {
    sorted = [...filteredResults].sort(
      (a, b) => (b.year ?? 0) - (a.year ?? 0) || (b.citations ?? -1) - (a.citations ?? -1),
    );
  } else {
    // 综合：尊重各源自己的相关性排序，跨源交错（此前这里会按引用数
    // 重排，导致没有引用数的 arXiv 整体沉底、相关性顺序被丢弃）
    sorted = interleaveBySource(filteredResults);
  }

  const finalResults = sorted.slice(0, query.maxResults || 50);

  return { results: finalResults, failedSources };
}
