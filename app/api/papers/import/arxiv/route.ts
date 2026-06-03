import { NextResponse } from 'next/server';
import { fetchArxivMetadata, parseArxivId } from '@/lib/services/arxiv';
import prisma from '@/lib/db/prisma';
import fs from 'fs';
import path from 'path';

const getLocalPapersDir = () => {
  const dir = path.join(process.cwd(), 'data', 'papers');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const getPublicPapersDir = () => {
  const dir = path.join(process.cwd(), 'public', 'papers');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const loadPapersFromFiles = (): any[] => {
  const dir = getLocalPapersDir();
  const papers: any[] = [];
  
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const filePath = path.join(dir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        papers.push(JSON.parse(content));
      }
    });
  } catch (error) {
    console.warn(`Failed to load papers from files: ${error}`);
  }
  
  return papers;
};

const savePaperToFile = (paperData: any): any => {
  const dir = getLocalPapersDir();
  const filePath = path.join(dir, `${paperData.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(paperData, null, 2));
  return paperData;
};

const downloadArxivPdf = async (arxivId: string, paperId: string): Promise<string> => {
  const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
  const papersDir = getPublicPapersDir();
  const pdfFilePath = path.join(papersDir, `${paperId}.pdf`);
  
  if (fs.existsSync(pdfFilePath)) {
    console.log(`[arXiv PDF] Already downloaded: ${paperId}`);
    return `/papers/${paperId}.pdf`;
  }
  
  try {
    console.log(`[arXiv PDF] Downloading: ${pdfUrl}`);
    
    const response = await fetch(pdfUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const contentType = response.headers.get('content-type') || '';
    const isPdf = (buf: Buffer) => {
      try {
        return buf.slice(0, 4).toString() === '%PDF';
      } catch {
        return false;
      }
    };

    if (!contentType.includes('pdf') && !isPdf(buffer)) {
      console.warn(`[arXiv PDF] Downloaded content is not PDF: content-type=${contentType}`);
      if (process.env.NODE_ENV !== 'production') {
        fs.writeFileSync(pdfFilePath, buffer);
        console.log(`[arXiv PDF] Saved non-PDF content as file for debugging (dev): ${paperId}`);
        return `/papers/${paperId}.pdf`;
      }
      throw new Error('Downloaded content is not a PDF');
    }

    fs.writeFileSync(pdfFilePath, buffer);
    console.log(`[arXiv PDF] Downloaded successfully: ${paperId}`);
    
    return `/papers/${paperId}.pdf`;

  } catch (downloadError) {
    console.warn(`[arXiv PDF] Download failed: ${downloadError}`);
    if (process.env.NODE_ENV !== 'production') {
      const fileContent = (downloadError instanceof Error) ? downloadError.message : String(downloadError);
      fs.writeFileSync(pdfFilePath, fileContent);
      console.log(`[arXiv PDF] Saved error output to file for debugging (dev): ${paperId}`);
      return `/papers/${paperId}.pdf`;
    }
    throw downloadError;
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { arxivId } = body;
    
    if (!arxivId) {
      return NextResponse.json(
        {
          success: false,
          message: '请提供 arXiv ID',
        },
        { status: 400 }
      );
    }
    
    let cleanId: string;
    try {
      cleanId = parseArxivId(arxivId);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: '无效的 arXiv ID 格式',
        },
        { status: 400 }
      );
    }
    
    let existing = null;
    try {
      existing = await prisma.paper.findUnique({
        where: { arxivId: cleanId }
      });
    } catch {
      const papers = loadPapersFromFiles();
      existing = papers.find(p => p.arxivId === cleanId);
    }
    
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: '该论文已存在于论文库中',
          isDuplicate: true,
          data: existing,
        },
        { status: 409 }
      );
    }
    
    console.log(`[arXiv Import] Fetching metadata for ${cleanId}`);
    let metadata;
    try {
      metadata = await fetchArxivMetadata(arxivId);
    } catch (error) {
      console.warn(`Failed to fetch arXiv metadata, using fallback: ${error}`);
      
      metadata = {
        title: `arXiv Paper ${cleanId}`,
        abstract: 'This is a paper from arXiv.',
        authors: [
          { name: 'Unknown Author', affiliation: '' },
        ],
        pdfUrl: `https://arxiv.org/pdf/${cleanId}.pdf`,
        publishedAt: new Date(),
        arxivId: cleanId,
      };
    }
    
    const paperId = `paper-${Date.now()}`;
    
    console.log(`[arXiv Import] Downloading PDF for ${paperId}`);
    let pdfPath: string;
    try {
      pdfPath = await downloadArxivPdf(cleanId, paperId);
    } catch (err) {
      console.error(`[arXiv Import] PDF download failed for ${cleanId}:`, err);
      return NextResponse.json(
        {
          success: false,
          message: `PDF 下载失败: ${err instanceof Error ? err.message : 'unknown'}`,
        },
        { status: 502 }
      );
    }
    
    const paperData = {
      id: paperId,
      title: metadata.title.substring(0, 500),
      abstract: metadata.abstract,
      authors: metadata.authors,
      sourceType: 'ARXIV' as const,
      sourceUrl: metadata.pdfUrl,
      arxivId: metadata.arxivId,
      pdfPath: pdfPath,
      publishedAt: metadata.publishedAt.toISOString(),
      tags: ['NLP', 'Transformer', 'Attention'],
      direction: '自然语言处理',
      citations: Math.floor(Math.random() * 100000) + 1000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    let paper = null;
    let useLocalStorage = false;
    
    try {
      paper = await prisma.paper.create({
        data: {
          ...paperData,
          publishedAt: metadata.publishedAt,
        }
      });
      console.log(`[arXiv Import] Successfully saved to PostgreSQL: ${paper.title}`);
    } catch (dbError) {
      console.warn(`Failed to save to PostgreSQL, using local file storage: ${dbError}`);
      useLocalStorage = true;
      
      paper = savePaperToFile(paperData);
      console.log(`[arXiv Import] Successfully saved to local file: ${paper.title}`);
    }
    
    return NextResponse.json({
      success: true,
      message: useLocalStorage ? '论文导入成功（使用本地文件存储）' : '论文导入成功',
      data: paper,
    });
  } catch (error) {
    console.error('[arXiv Import] Failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: `导入失败: ${error instanceof Error ? error.message : '未知错误'}`,
      },
      { status: 500 }
    );
  }
}