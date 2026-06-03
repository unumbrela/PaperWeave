import { NextResponse } from 'next/server';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

export const runtime = 'nodejs';
export const maxDuration = 60;

// 无状态助手：仅在内存里解析 PDF 文本并返回论文数据；不落盘（Vercel 文件系统只读）。
// PDF 原始二进制由客户端直接存入 Dexie Blob（真离线），入库写本地（单一真相源）。

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: '请选择要上传的 PDF 文件',
        },
        { status: 400 }
      );
    }
    
    if (!file.type.includes('application/pdf')) {
      return NextResponse.json(
        {
          success: false,
          message: '请上传 PDF 格式的文件',
        },
        { status: 400 }
      );
    }
    
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          message: '文件大小不能超过 50MB',
        },
        { status: 400 }
      );
    }
    
    console.log(`[PDF Import] Reading file: ${file.name}`);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`[PDF Import] Extracting text from PDF`);
    let extractedText = '';
    
    try {
      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        disableFontFace: true,
        useWorkerFetch: false,
      }).promise;
      
      const numPages = pdf.numPages;
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        extractedText += textContent.items.map((item) => ('str' in item ? item.str : '')).join(' ') + '\n\n';
      }
      
      await pdf.destroy();
    } catch (pdfError) {
      console.warn(`PDF parsing failed: ${pdfError}`);
      extractedText = '无法提取文本内容';
    }
    
    const paperId = `paper-${Date.now()}`;

    // 不落盘：PDF 二进制由客户端拿到响应后直接存入 Dexie Blob（见 library 的 handlePdfImport）
    const paperData = {
      id: paperId,
      title: file.name.replace(/\.pdf$/i, '').substring(0, 500),
      abstract: extractedText.substring(0, 5000) || '未提取到文本内容',
      authors: [],
      sourceType: 'LOCAL' as const,
      tags: ['本地上传'],
      citations: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'PDF 解析成功',
      data: paperData,
    });
  } catch (error) {
    console.error('[PDF Import] Failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: `导入失败: ${error instanceof Error ? error.message : '未知错误'}`,
      },
      { status: 500 }
    );
  }
}