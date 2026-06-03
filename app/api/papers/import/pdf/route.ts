import { NextResponse } from 'next/server';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';

// 无状态助手：解析 PDF 文本 + 落地文件到 public/papers，返回论文数据。
// 不再持久化到 Prisma / 本地 JSON —— 入库由客户端写入 Dexie（单一真相源）。

const getPapersDir = () => {
  const dir = path.join(process.cwd(), 'public', 'papers');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

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
    const papersDir = getPapersDir();
    const finalPdfPath = path.join(papersDir, `${paperId}.pdf`);
    
    fs.writeFileSync(finalPdfPath, buffer);
    console.log(`[PDF Import] File saved to papers directory: ${finalPdfPath}`);
    
    const paperData = {
      id: paperId,
      title: file.name.replace(/\.pdf$/i, '').substring(0, 500),
      abstract: extractedText.substring(0, 5000) || '未提取到文本内容',
      authors: [],
      sourceType: 'LOCAL' as const,
      pdfPath: `/papers/${paperId}.pdf`,
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