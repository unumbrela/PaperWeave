import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

// 可选云同步端点：客户端以本地 Dexie 为单一真相源；本路由仅在配置了
// DATABASE_URL（Postgres）时作为可选同步层。未配置时优雅降级，不再写本地 JSON 文件。

const CLOUD_ENABLED = !!process.env.DATABASE_URL;

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

    // 未配置云端：客户端应直接读本地 Dexie，这里返回空集合即可
    if (!CLOUD_ENABLED) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { page, limit, total: 0, pages: 0 },
        source: 'local',
      });
    }

    const where: Record<string, unknown> = {};
    if (direction) where.direction = direction;
    if (sourceType) where.sourceType = sourceType;
    if (tags) {
      where.tags = { hasSome: tags.split(',').map((t: string) => t.trim()) };
    }

    const orderBy: Record<string, string> = { [sortBy]: sortOrder };

    const [papers, total] = await Promise.all([
      prisma.paper.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.paper.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: papers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      source: 'database',
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

    // 未配置云端：本地 Dexie 已是真相源，这里作为可选同步直接 no-op 成功返回
    if (!CLOUD_ENABLED) {
      return NextResponse.json({ success: true, message: '本地模式（已写入本地库）', data: body });
    }

    const paperData = {
      id: body.id || `paper-${Date.now()}`,
      arxivId: body.arxivId || null,
      title: body.title,
      abstract: body.abstract,
      authors: normalizeAuthors(body.authors),
      sourceType: normalizeSourceType(body.sourceType),
      sourceUrl: body.sourceUrl,
      pdfPath: body.pdfPath,
      publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
      tags: body.tags || [],
      direction: body.direction,
      notes: body.notes,
      summary: body.summary,
      methodology: body.methodology,
      contribution: body.contribution,
      citations: typeof body.citations === 'number' ? body.citations : 0,
    };

    // upsert：云同步幂等，重复推送不报错
    const paper = await prisma.paper.upsert({
      where: { id: paperData.id },
      create: paperData,
      update: paperData,
    });

    return NextResponse.json({ success: true, message: '论文已同步到云端', data: paper });
  } catch (error) {
    console.error('创建论文失败:', error);
    return NextResponse.json(
      { success: false, message: '创建论文失败' },
      { status: 500 }
    );
  }
}
