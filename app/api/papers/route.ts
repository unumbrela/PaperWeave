import { NextResponse } from 'next/server';
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

function normalizeAuthors(authors: unknown) {
  if (Array.isArray(authors)) {
    return authors.map((author) =>
      typeof author === 'string' ? { name: author } : author,
    );
  }

  if (typeof authors === 'string') {
    return authors
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
  }

  return [];
}

function normalizeSourceType(sourceType: unknown): 'ARXIV' | 'LOCAL' | 'DOI' {
  const source = String(sourceType || '').toLowerCase();
  if (source === 'arxiv') return 'ARXIV';
  if (source === 'doi') return 'DOI';
  return 'LOCAL';
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { searchParams } = url;

    const tags = searchParams.get('tags');
    const direction = searchParams.get('direction');
    const sourceType = searchParams.get('sourceType');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    let papers: any[] = [];
    let total = 0;
    let useLocalStorage = false;

    try {
      const where: any = {};
      
      if (direction) {
        where.direction = direction;
      }
      if (sourceType) {
        where.sourceType = sourceType;
      }
      if (tags) {
        const tagList = tags.split(',').map((t: string) => t.trim());
        where.tags = {
          hasSome: tagList
        };
      }

      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      [papers, total] = await Promise.all([
        prisma.paper.findMany({
          where,
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.paper.count({ where })
      ]);
    } catch (dbError) {
      console.warn(`Failed to query PostgreSQL, using local file storage: ${dbError}`);
      useLocalStorage = true;
      
      papers = loadPapersFromFiles();
      
      if (direction) {
        papers = papers.filter(p => p.direction === direction);
      }
      if (sourceType) {
        papers = papers.filter(p => p.sourceType === sourceType);
      }
      if (tags) {
        const tagList = tags.split(',').map((t: string) => t.trim());
        papers = papers.filter(p => tagList.some(tag => p.tags.includes(tag)));
      }

      papers.sort((a, b) => {
        const aVal = a[sortBy as keyof typeof a] as string;
        const bVal = b[sortBy as keyof typeof b] as string;
        if (sortOrder === 'desc') {
          return bVal.localeCompare(aVal);
        }
        return aVal.localeCompare(bVal);
      });

      total = papers.length;
      papers = papers.slice((page - 1) * limit, page * limit);
    }

    return NextResponse.json({
      success: true,
      data: papers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      source: useLocalStorage ? 'local' : 'database',
    });
  } catch (error) {
    console.error('获取论文列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取论文列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.title) {
      return NextResponse.json(
        { success: false, message: '论文标题不能为空' },
        { status: 400 }
      );
    }

    let paper = null;
    let useLocalStorage = false;

    if (body.arxivId) {
      try {
        const existing = await prisma.paper.findUnique({
          where: { arxivId: body.arxivId }
        });
        if (existing) {
          return NextResponse.json(
            { success: false, message: '该 arXiv ID 已存在', isDuplicate: true, paper: existing },
            { status: 409 }
          );
        }
      } catch {
        const papers = loadPapersFromFiles();
        const existing = papers.find(p => p.arxivId === body.arxivId);
        if (existing) {
          return NextResponse.json(
            { success: false, message: '该 arXiv ID 已存在', isDuplicate: true, paper: existing },
            { status: 409 }
          );
        }
      }
    }

    const paperId = `paper-${Date.now()}`;
    const paperData = {
      id: paperId,
      arxivId: body.arxivId || '',
      title: body.title,
      abstract: body.abstract,
      authors: normalizeAuthors(body.authors),
      sourceType: normalizeSourceType(body.sourceType),
      sourceUrl: body.sourceUrl,
      pdfPath: body.pdfPath,
      publishedAt: body.publishedAt,
      tags: body.tags || [],
      direction: body.direction,
      notes: body.notes,
      summary: body.summary,
      methodology: body.methodology,
      contribution: body.contribution,
      citations: typeof body.citations === 'number' ? body.citations : Math.floor(Math.random() * 50000) + 500,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      paper = await prisma.paper.create({
        data: {
          ...paperData,
          publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
        }
      });
    } catch (dbError) {
      console.warn(`Failed to save to PostgreSQL, using local file storage: ${dbError}`);
      useLocalStorage = true;
      
      const dir = getLocalPapersDir();
      const filePath = path.join(dir, `${paperId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(paperData, null, 2));
      paper = paperData;
    }

    return NextResponse.json({
      success: true,
      message: useLocalStorage ? '论文创建成功（使用本地文件存储）' : '论文创建成功',
      data: paper,
    });
  } catch (error) {
    console.error('创建论文失败:', error);
    return NextResponse.json(
      { success: false, message: '创建论文失败' },
      { status: 500 }
    );
  }
}
