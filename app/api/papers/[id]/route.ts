import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

// 可选云同步端点：客户端以本地 Dexie 为单一真相源。本路由仅在配置了
// DATABASE_URL（Postgres）时作为可选同步层；未配置时优雅降级，不再读写本地 JSON 文件。

const CLOUD_ENABLED = !!process.env.DATABASE_URL;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!CLOUD_ENABLED) {
      return NextResponse.json({ success: false, message: '本地模式：请从本地库读取' }, { status: 404 });
    }

    const paper = await prisma.paper.findUnique({ where: { id } });
    if (!paper) {
      return NextResponse.json({ success: false, message: '论文不存在' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: paper });
  } catch (error) {
    console.error('获取论文详情失败:', error);
    return NextResponse.json({ success: false, message: '获取论文详情失败' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!CLOUD_ENABLED) {
      return NextResponse.json({ success: true, message: '本地模式（已写入本地库）', data: body });
    }

    const paper = await prisma.paper.update({
      where: { id },
      data: {
        ...(body.title && { title: String(body.title).substring(0, 500) }),
        ...(body.abstract !== undefined && { abstract: body.abstract }),
        ...(body.authors && { authors: body.authors }),
        ...(body.sourceType && { sourceType: body.sourceType }),
        ...(body.sourceUrl && { sourceUrl: body.sourceUrl }),
        ...(body.pdfPath && { pdfPath: body.pdfPath }),
        ...(body.publishedAt && { publishedAt: new Date(body.publishedAt) }),
        ...(body.tags && { tags: body.tags }),
        ...(body.direction !== undefined && { direction: body.direction }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.summary !== undefined && { summary: body.summary }),
        ...(body.methodology !== undefined && { methodology: body.methodology }),
        ...(body.contribution !== undefined && { contribution: body.contribution }),
      },
    });

    return NextResponse.json({ success: true, message: '论文已同步到云端', data: paper });
  } catch (error) {
    console.error('更新论文失败:', error);
    return NextResponse.json({ success: false, message: '更新论文失败' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!CLOUD_ENABLED) {
      return NextResponse.json({ success: true, message: '本地模式（已从本地库删除）' });
    }

    await prisma.paper.delete({ where: { id } }).catch(() => {
      // 云端不存在视为幂等成功
    });

    return NextResponse.json({ success: true, message: '论文已从云端删除' });
  } catch (error) {
    console.error('删除论文失败:', error);
    return NextResponse.json({ success: false, message: '删除论文失败' }, { status: 500 });
  }
}
