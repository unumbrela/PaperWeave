/**
 * arXiv API 服务
 * 
 * 提供 arXiv 论文元数据抓取和 PDF 下载功能
 */

import { parseStringPromise } from 'xml2js';

/**
 * arXiv 论文元数据接口
 */
export interface ArxivMetadata {
  title: string;
  abstract: string;
  authors: Array<{ name: string; affiliation?: string }>;
  pdfUrl: string;
  publishedAt: Date;
  arxivId: string;
}

/**
 * 解析用户输入的 arXiv ID
 * 
 * 支持多种格式:
 * - arxiv:1234.56789
 * - 1234.56789
 * - https://arxiv.org/abs/1234.56789
 * - https://arxiv.org/pdf/1234.56789.pdf
 */
export function parseArxivId(input: string): string {
  // 移除可能的前缀
  let id = input.trim().toLowerCase();
  
  // 匹配 URL 中的 ID
  const urlMatch = id.match(/arxiv\.org\/(abs|pdf)\/([0-9]+\.[0-9]+)(\.pdf)?/);
  if (urlMatch) {
    return urlMatch[2];
  }
  
  // 移除 arxiv: 前缀
  id = id.replace(/^arxiv:/, '');
  
  // 验证格式: 数字.数字
  if (/^[0-9]+\.[0-9]+$/.test(id)) {
    return id;
  }
  
  throw new Error('Invalid arXiv ID format');
}

/**
 * 从 arXiv API 获取论文元数据
 * 
 * @param arxivId arXiv 论文 ID (如: 1234.56789)
 * @returns 论文元数据对象
 */
export async function fetchArxivMetadata(arxivId: string): Promise<ArxivMetadata> {
  const cleanId = parseArxivId(arxivId);
  
  // arXiv API endpoint
  const apiUrl = `http://export.arxiv.org/api/query?id_list=${cleanId}`;
  
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch arXiv metadata: ${response.status}`);
  }
  
  const xmlString = await response.text();
  
  // 解析 XML
  const result = await parseStringPromise(xmlString, {
    explicitArray: false,
    ignoreAttrs: false,
  });
  
  const entry = result.feed.entry;
  
  if (!entry) {
    throw new Error('No paper found with this arXiv ID');
  }
  
  // xml2js 节点：纯文本会是 string，带属性时是 { _: text, $: attrs }
  const xmlText = (v: unknown): string | undefined =>
    typeof v === 'string' ? v : (v as { _?: string } | undefined)?._;

  // 提取作者信息
  let authors: Array<{ name: string; affiliation?: string }> = [];
  if (entry.author) {
    const authorList = Array.isArray(entry.author) ? entry.author : [entry.author];
    authors = authorList.map((author: { name?: unknown; affiliation?: unknown }) => ({
      name: xmlText(author.name) || 'Unknown',
      affiliation: xmlText(author.affiliation),
    }));
  }

  // 提取链接，找到 PDF 链接
  let pdfUrl = '';
  if (entry.link) {
    const links = Array.isArray(entry.link) ? entry.link : [entry.link];
    const pdfLink = links.find(
      (link: { $?: { rel?: string; type?: string; href?: string } }) =>
        link.$?.rel === 'alternate' && link.$?.type === 'application/pdf',
    );
    if (pdfLink) {
      pdfUrl = pdfLink.$?.href || '';
    }
  }
  
  // 如果没找到 PDF 链接，构造默认链接
  if (!pdfUrl) {
    pdfUrl = `https://arxiv.org/pdf/${cleanId}.pdf`;
  }
  
  return {
    title: entry.title?.['_'] || entry.title || 'Untitled',
    abstract: entry.summary?.['_'] || entry.summary || '',
    authors,
    pdfUrl,
    publishedAt: new Date(entry.published || new Date()),
    arxivId: cleanId,
  };
}

/**
 * 下载 arXiv PDF 为 Buffer
 * 
 * @param arxivId arXiv 论文 ID
 * @returns PDF 文件的 Buffer
 */
export async function downloadArxivPdf(arxivId: string): Promise<Buffer> {
  const metadata = await fetchArxivMetadata(arxivId);
  
  const response = await fetch(metadata.pdfUrl);
  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * 生成 PDF 文件名
 * 
 * @param arxivId arXiv ID
 * @param title 论文标题（用于生成可读性文件名）
 * @returns 规范化的文件名
 */
export function generatePdfFileName(arxivId: string, title: string): string {
  // 清理标题，移除特殊字符
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
  
  return `${arxivId}_${cleanTitle}.pdf`;
}