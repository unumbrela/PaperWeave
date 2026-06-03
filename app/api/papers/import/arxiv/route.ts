import { NextResponse } from 'next/server';
import { fetchArxivMetadata, parseArxivId } from '@/lib/services/arxiv';

// 无状态助手：只负责拉取 arXiv 元数据，返回论文数据（不持久化、不落盘）。
// PDF 不再下载到 public/papers（Vercel 文件系统只读）；改为把 pdfPath 指向同源 PDF
// 代理 `/api/pdf-proxy`，viewer 读取后缓存为本地 Blob（真离线）。入库由客户端写 Dexie。

/** 远端 arXiv PDF → 同源代理 URL（前端读取无 CORS、serverless 无落盘） */
const proxiedPdfPath = (arxivId: string): string =>
  `/api/pdf-proxy?url=${encodeURIComponent(`https://arxiv.org/pdf/${arxivId}.pdf`)}`;

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

    // 不再下载落盘：pdfPath 指向同源 PDF 代理，viewer 读取后自动缓存为本地 Blob
    const pdfPath = proxiedPdfPath(cleanId);

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
      tags: ['arXiv'],
      citations: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: '论文元数据获取成功',
      data: paperData,
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