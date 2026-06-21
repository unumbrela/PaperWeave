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
          // 只取「真·直链 PDF」：open_access.oa_url 常是 DOI 落地页（HTML），
          // 包进 pdf-proxy 抓回来不是 PDF → 415/502，精读打不开。OpenAlex 已内含
          // Unpaywall 数据，直链在 *.pdf_url；没有就留空，交给前端兜底（打开原文/上传）。
          pdfUrl:
            work.best_oa_location?.pdf_url ||
            work.primary_location?.pdf_url ||
            work.locations?.find((l: { pdf_url?: string }) => l?.pdf_url)?.pdf_url ||
            undefined,
          abstract: work.abstract || restoreOpenAlexAbstract(work.abstract_inverted_index),
          citations: work.cited_by_count,
          doi: normalizeDoi(work.doi),
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
      
      // PDF 链接直接由 arXiv id 构造，而非解析 <link>：arXiv 的 pdf link 是
      // `<link href="..." ... title="pdf"/>`（title 在末尾），旧解析假设 `link title="pdf"`
      // 紧挨着出现 → 永远匹配不到 → arXiv 论文全都没有 pdfUrl（搜索结果没有「阅读」入口）。
      const pdfUrl = id ? `https://arxiv.org/pdf/${id}.pdf` : undefined;

      results.push({
        id,
        title,
        authors,
        year,
        url: `https://arxiv.org/abs/${id}`,
        pdfUrl: pdfUrl,
        abstract: summary,
        arxivId: id,
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

export async function searchCrossref(query: SearchQuery): Promise<PaperResult[]> {
  const results: PaperResult[] = [];

  try {
    const keywordQuery = buildKeywordQuery(query);
    if (!keywordQuery) return results;

    const rows = Math.min(Math.max(query.maxResults || 30, 20), 100);
    const params = new URLSearchParams();
    params.set('query', keywordQuery);
    params.set('rows', String(rows));
    // 只取需要的字段，压低响应体积
    params.set('select', 'DOI,title,author,issued,container-title,is-referenced-by-count,abstract,URL');

    const filters: string[] = ['type:journal-article'];
    if (query.startYear) filters.push(`from-pub-date:${query.startYear}-01-01`);
    if (query.endYear) filters.push(`until-pub-date:${query.endYear}-12-31`);
    params.set('filter', filters.join(','));

    // sortBy=year/最新优先：按出版日期降序；其余走 Crossref 相关性
    if (query.sortBy === 'year') {
      params.set('sort', 'published');
      params.set('order', 'desc');
    }

    const url = `https://api.crossref.org/works?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        // Crossref 礼貌池：带可联系信息换取更稳定的限流配额
        'User-Agent':
          'PaperWeave/1.0 (https://github.com/unumbrela/toolbox; mailto:noreply@paperweave.app)',
      },
    });
    if (!response.ok) {
      throw new Error(`Crossref API error: ${response.status}`);
    }

    const data = await response.json();
    const items: unknown[] = data?.message?.items || [];

    for (const raw of items) {
      const work = raw as {
        DOI?: string;
        title?: string[];
        author?: Array<{ given?: string; family?: string; name?: string }>;
        issued?: { 'date-parts'?: number[][] };
        'container-title'?: string[];
        'is-referenced-by-count'?: number;
        abstract?: string;
        URL?: string;
      };
      const title = work.title?.[0]?.trim();
      if (!title) continue; // Crossref 偶有无标题条目（如勘误），跳过

      const authors = (work.author || [])
        .map((a) => a.name || [a.given, a.family].filter(Boolean).join(' '))
        .filter(Boolean) as string[];

      const year = work.issued?.['date-parts']?.[0]?.[0];
      // Crossref 摘要常带 JATS XML 标签，去标签留纯文本
      const abstract = work.abstract
        ? work.abstract.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
        : undefined;

      results.push({
        id: work.DOI ? `crossref-${work.DOI}` : `crossref-${title.slice(0, 40)}`,
        title,
        authors,
        year: typeof year === 'number' ? year : undefined,
        venue: work['container-title']?.[0],
        url: work.URL || (work.DOI ? `https://doi.org/${work.DOI}` : ''),
        abstract,
        citations: work['is-referenced-by-count'],
        doi: normalizeDoi(work.DOI),
        source: 'crossref',
      });
    }
  } catch (error) {
    console.error('Crossref search failed:', error);
    throw error;
  }

  return results;
}

export async function searchEuropePMC(query: SearchQuery): Promise<PaperResult[]> {
  const results: PaperResult[] = [];

  try {
    const keywordQuery = buildKeywordQuery(query);
    if (!keywordQuery) return results;

    const pageSize = Math.min(Math.max(query.maxResults || 30, 20), 100);

    // Europe PMC 查询语法支持 PUB_YEAR 闭区间；预印本（bioRxiv/medRxiv）source=PPR
    let q = keywordQuery;
    if (query.startYear || query.endYear) {
      const start = query.startYear || 1900;
      const end = query.endYear || new Date().getFullYear();
      q += ` AND (PUB_YEAR:[${start} TO ${end}])`;
    }

    const params = new URLSearchParams();
    params.set('query', q);
    params.set('format', 'json');
    params.set('pageSize', String(pageSize));
    params.set('resultType', 'core'); // core 才带 abstractText
    if (query.sortBy === 'year') params.set('sort', 'P_PDATE_D desc');
    else if (query.sortBy === 'citations') params.set('sort', 'CITED desc');

    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'PaperWeave/1.0 (https://github.com/unumbrela/toolbox; mailto:noreply@paperweave.app)',
      },
    });
    if (!response.ok) {
      throw new Error(`Europe PMC API error: ${response.status}`);
    }

    const data = await response.json();
    const items: unknown[] = data?.resultList?.result || [];

    for (const raw of items) {
      const r = raw as {
        id?: string;
        source?: string;
        doi?: string;
        title?: string;
        authorString?: string;
        pubYear?: string;
        citedByCount?: number;
        abstractText?: string;
        journalInfo?: { journal?: { title?: string } };
        bookOrReportDetails?: { publisher?: string };
        fullTextUrlList?: { fullTextUrl?: Array<{ documentStyle?: string; url?: string }> };
      };
      const title = r.title?.trim();
      if (!title) continue;

      const authors = r.authorString
        ? r.authorString.replace(/\.\s*$/, '').split(/,\s*/).filter(Boolean)
        : [];
      const year = r.pubYear ? parseInt(r.pubYear, 10) : undefined;
      const pdfUrl = (r.fullTextUrlList?.fullTextUrl || []).find(
        (u) => (u.documentStyle || '').toLowerCase() === 'pdf' && u.url,
      )?.url;
      const venue = r.journalInfo?.journal?.title || r.bookOrReportDetails?.publisher;
      const articlePath = r.source && r.id ? `${r.source}/${r.id}` : undefined;

      results.push({
        id: r.doi ? `europepmc-${r.doi}` : `europepmc-${r.source}-${r.id}`,
        title,
        authors,
        year: Number.isFinite(year) ? year : undefined,
        venue,
        url: articlePath
          ? `https://europepmc.org/article/${articlePath}`
          : r.doi
            ? `https://doi.org/${r.doi}`
            : '',
        pdfUrl,
        abstract: r.abstractText,
        citations: typeof r.citedByCount === 'number' ? r.citedByCount : undefined,
        doi: normalizeDoi(r.doi),
        source: 'europepmc',
      });
    }
  } catch (error) {
    console.error('Europe PMC search failed:', error);
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

/** 归一化 DOI：去 doi.org/dx.doi.org 前缀、小写、去空白。空值返回 undefined。 */
export function normalizeDoi(doi?: string): string | undefined {
  if (!doi) return undefined;
  const v = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim().toLowerCase();
  return v || undefined;
}

/** arXiv id 归一化：去版本号 vN，便于 v1/v2 视为同篇。 */
function arxivBase(id: string): string {
  return id.replace(/v\d+$/i, '').trim().toLowerCase();
}

// arXiv 自家 DataCite DOI 形如 10.48550/arXiv.2401.00001 —— 据此把 OpenAlex/Crossref
// 记录桥接回 arXiv 预印本（二者共享同一 arxivId，标题再不一致也能合并）。
const ARXIV_DOI_RE = /^10\.48550\/arxiv\.(.+)$/i;

/**
 * 一篇论文的全部身份键：DOI > arXiv id > 标题。
 * 共享任一键即视为同一篇（并查集合并），DOI/arXiv 主键消除标题细微差异导致的漏合并，
 * 标题键兜底（无任何标识时仍能去重）。
 */
export function identityKeys(p: PaperResult): string[] {
  const keys: string[] = [];
  const doi = normalizeDoi(p.doi);
  if (doi) {
    keys.push(`doi:${doi}`);
    const m = doi.match(ARXIV_DOI_RE);
    if (m) keys.push(`arxiv:${arxivBase(m[1])}`);
  }
  if (p.arxivId) keys.push(`arxiv:${arxivBase(p.arxivId)}`);
  keys.push(`title:${normalizeTitleKey(p.title)}`);
  return keys;
}

/** 缺失字段从重复条目补齐（保留先到者身份；引用数 0 不被当成缺失覆盖）。 */
function fillMissing(into: PaperResult, from: PaperResult): void {
  if (into.citations == null && from.citations != null) into.citations = from.citations;
  if (!into.pdfUrl && from.pdfUrl) into.pdfUrl = from.pdfUrl;
  if (!into.venue && from.venue) into.venue = from.venue;
  if (!into.abstract && from.abstract) into.abstract = from.abstract;
  if (!into.year && from.year) into.year = from.year;
  if (into.authors.length === 0 && from.authors.length > 0) into.authors = from.authors;
  if (!into.doi && from.doi) into.doi = from.doi;
  if (!into.arxivId && from.arxivId) into.arxivId = from.arxivId;
}

/**
 * 跨源合并：用并查集按「DOI / arXiv id / 标题」任一共享键把同一篇论文合并为一条，
 * 保留先到源的身份字段，缺失字段从重复条目补齐——
 * 典型收益：OpenAlex 提供引用数、arXiv 提供稳定 PDF；DOI/arXiv 主键修掉
 * 「预印本 vs 正式出版版」标题细微差异（副标题/大小写/vN）导致的漏合并。
 */
export function mergeDuplicates(results: PaperResult[]): PaperResult[] {
  const n = results.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  // union 总把较大下标指向较小下标 → 每个连通分量的根 = 最先到的那篇
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
  };

  const keyOwner = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    for (const k of identityKeys(results[i])) {
      const owner = keyOwner.get(k);
      if (owner === undefined) keyOwner.set(k, i);
      else union(i, owner);
    }
  }

  // 按根分组：根（最小下标）先被遍历到 → 作为代表，其余条目补齐其缺失字段
  const byRoot = new Map<number, PaperResult>();
  const order: number[] = [];
  for (let i = 0; i < n; i++) {
    const r = find(i);
    const existing = byRoot.get(r);
    if (!existing) {
      byRoot.set(r, { ...results[i] });
      order.push(r);
    } else {
      fillMissing(existing, results[i]);
    }
  }
  return order.map((r) => byRoot.get(r)!);
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
  crossref: 'Crossref',
  europepmc: 'Europe PMC',
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
  if (sources.includes('crossref')) {
    labeled.push({ source: 'crossref', task: searchCrossref(query) });
  }
  if (sources.includes('europepmc')) {
    labeled.push({ source: 'europepmc', task: searchEuropePMC(query) });
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

/**
 * fan-out 综合重排：相关性模式下，命中越多子查询的论文越「中心」（覆盖广度），
 * 叠加时新度与引用作为次权重。确定性、无 LLM，便于单测。
 * 引用/年份模式不在此处理（调用方走原有确定性排序）。
 */
export function rerankFanout(
  results: PaperResult[],
  hitCounts: Map<string, number>,
): PaperResult[] {
  const nowYear = new Date().getFullYear();
  const score = (p: PaperResult) => {
    const hits = hitCounts.get(normalizeTitleKey(p.title)) ?? 1;
    // 覆盖广度为主权重：命中 k 条子查询 → +k（最强信号，说明主题中心）
    let s = hits * 10;
    // 时新度：近 5 年线性加成（鼓励新论文，呼应「抓到最新」）
    if (p.year) s += Math.max(0, 5 - (nowYear - p.year)) * 0.5;
    // 引用：对数加成，避免老论文凭高引用碾压新论文
    if (p.citations && p.citations > 0) s += Math.log10(p.citations + 1);
    return s;
  };
  return [...results]
    .map((p, i) => ({ p, i, s: score(p) }))
    .sort((a, b) => b.s - a.s || a.i - b.i) // 同分保持原始顺序（稳定）
    .map((x) => x.p);
}

/**
 * 有上限的并发执行：最多 limit 个任务同时在飞，结果按输入顺序返回（settled 语义）。
 * 用于给 fan-out 限速——否则一次检索 = 子查询数 × 源数 次请求并发打上游，易触发限流。
 */
export async function runPooled<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const results = new Array<PromiseSettledResult<T>>(tasks.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= tasks.length) return;
      try {
        results[i] = { status: 'fulfilled', value: await tasks[i]() };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  }
  const workers = Array.from({ length: Math.max(1, Math.min(limit, tasks.length)) }, worker);
  await Promise.all(workers);
  return results;
}

/** fan-out 时同时在飞的子查询上限（× 源数 = 实际上游并发上限）。 */
export const FANOUT_CONCURRENCY = 2;

/**
 * Perplexity 式 fan-out 检索：对多条子查询各自跨源检索，
 * 合并去重后按「命中子查询数 + 时新度 + 引用」综合重排。
 * subqueries 由调用方（API 路由）经 expandQuery 算出；
 * 子查询 ≤1 条时退化为普通 searchPapers，行为与零 key 路径完全一致。
 * 子查询经 runPooled 限制并发，避免打爆上游。
 */
export async function searchPapersExpanded(
  query: SearchQuery,
  sources: string[],
  subqueries: string[],
  apiKeys?: Record<string, string>,
): Promise<SearchOutcome> {
  if (subqueries.length <= 1) {
    return searchPapers(query, sources, apiKeys);
  }

  // 每条子查询多取一些，跨源合并后再统一截断，避免召回被过早砍掉
  const perVariantMax = Math.min(
    100,
    Math.max(20, Math.ceil(((query.maxResults || 30) * 1.5) / subqueries.length)),
  );

  // 任务工厂（不立即执行）→ runPooled 控制同时在飞的数量，限制上游并发
  const tasks = subqueries.map((sub) => () =>
    searchPapers(
      // 子查询作为关键词；清掉自由文本意图字段，避免每条都拼上长目标稀释多样性
      { ...query, keywords: sub, researchGoal: undefined, methodHints: undefined, maxResults: perVariantMax },
      sources,
      apiKeys,
    ),
  );

  const settled = await runPooled(tasks, FANOUT_CONCURRENCY);

  // 命中计数（去重前统计：一篇论文被多少条子查询召回 = 主题中心度）
  const hitCounts = new Map<string, number>();
  const all: PaperResult[] = [];
  const failed = new Set<string>();
  for (const outcome of settled) {
    if (outcome.status !== 'fulfilled') continue;
    outcome.value.failedSources.forEach((f) => failed.add(f));
    const seenInThisVariant = new Set<string>();
    for (const p of outcome.value.results) {
      const key = normalizeTitleKey(p.title);
      // 同一变体内同篇只计一次
      if (!seenInThisVariant.has(key)) {
        seenInThisVariant.add(key);
        hitCounts.set(key, (hitCounts.get(key) ?? 0) + 1);
      }
      all.push(p);
    }
  }

  const merged = mergeDuplicates(all).filter(
    (paper) => shouldKeepPaper(paper, query) && withinYearRange(paper, query),
  );

  let sorted: PaperResult[];
  if (query.sortBy === 'citations') {
    sorted = [...merged].sort(
      (a, b) => (b.citations ?? -1) - (a.citations ?? -1) || (b.year ?? 0) - (a.year ?? 0),
    );
  } else if (query.sortBy === 'year') {
    sorted = [...merged].sort(
      (a, b) => (b.year ?? 0) - (a.year ?? 0) || (b.citations ?? -1) - (a.citations ?? -1),
    );
  } else {
    sorted = rerankFanout(merged, hitCounts);
  }

  return { results: sorted.slice(0, query.maxResults || 50), failedSources: [...failed] };
}
