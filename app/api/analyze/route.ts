import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { callAnalysis, parseAnalysis, toPaperFields, ANALYSIS_OUTPUT_SPEC } from '@/lib/ai/analyze';
import prisma from '@/lib/db/prisma';

const extractTextFromPdf = async (pdfPath: string): Promise<string> => {
  try {
    const fullPath = path.join(process.cwd(), 'public', pdfPath);

    if (!fs.existsSync(fullPath)) {
      console.warn(`PDF file not found: ${fullPath}`);
      return '';
    }

    const buffer = fs.readFileSync(fullPath);

    // Avoid importing pdfjs at module top-level to prevent worker setup on server.
    // Use a lightweight Node PDF parser when running on the server to extract text.
    try {
      const { PdfReader } = await import('pdfreader');
      return await new Promise<string>((resolve) => {
        const rows: Record<number, string[]> = {};
        const reader = new PdfReader();
        reader.parseBuffer(buffer, (err: unknown, item: { text?: string; y?: number } | null) => {
          if (err) {
            console.warn('pdfreader parse error:', err);
            resolve('');
            return;
          }
          if (!item) {
            // end of file
            const lines = Object.keys(rows)
              .sort((a, b) => Number(a) - Number(b))
              .map((k) => (rows[Number(k)] || []).join(' '));
            resolve(lines.join('\n\n').substring(0, 5000));
            return;
          }
          if (item.text) {
            const y = Math.round(item.y || 0);
            rows[y] = rows[y] || [];
            rows[y].push(item.text.trim());
          }
        });
      });
    } catch (e) {
      console.warn('pdfreader not available or failed, skipping PDF text extraction:', e);
      return '';
    }
  } catch (error) {
    console.warn(`Failed to extract text from PDF: ${error}`);
    return '';
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, paperId } = body;

    if (!text && !paperId) {
      return NextResponse.json(
        {
          success: false,
          message: '请提供要分析的文本内容或论文 ID',
        },
        { status: 400 }
      );
    }

    let contentToAnalyze = text || '';

    if (paperId) {
      let paper = null;

      try {
        paper = await prisma.paper.findUnique({
          where: { id: paperId }
        });
      } catch {
        paper = null;
      }

      if (paper) {
        if (paper.abstract) {
          contentToAnalyze = paper.abstract;
        }

        if (paper.pdfPath) {
          const pdfText = await extractTextFromPdf(paper.pdfPath);
          if (pdfText) {
            contentToAnalyze = (contentToAnalyze + '\n\n' + pdfText).substring(0, 5000);
          }
        }
      }
    }

    console.log(`[AI Analyze] Analyzing content (${contentToAnalyze.length} chars) for ${paperId ? `paper ${paperId}` : 'text'}`);

    const prompt = `任务说明：请从给定的论文摘要或文本中提取关键信息，并以机器可解析的严格 JSON 返回。\n\n输入文本：\n${contentToAnalyze}\n\n${ANALYSIS_OUTPUT_SPEC}\n\n请严格输出 JSON，立即开始处理。`;

    const raw = await callAnalysis(prompt);
    const parsed = parseAnalysis(raw);

    const paperAnalysis = parsed
      ? toPaperFields(parsed)
      : {
          summary: '未分析成功',
          methodology: '未分析成功',
          contribution: '未分析成功',
          notes: '未分析成功',
        };

    // 可选云同步：仅当配置了 Postgres 时尝试回写；失败忽略（本地 Dexie 为准）
    if (paperId) {
      try {
        await prisma.paper.update({
          where: { id: paperId },
          data: {
            summary: paperAnalysis.summary,
            methodology: paperAnalysis.methodology,
            contribution: paperAnalysis.contribution,
            notes: paperAnalysis.notes,
          },
        });
      } catch {
        // 未配数据库或论文不在云端 —— 忽略，分析结果通过返回值交给客户端写入本地
      }
    }
    return NextResponse.json({ success: true, message: parsed ? '分析完成' : 'AI 输出无法解析为 JSON，标记为未分析成功', data: { id: paperId, ...paperAnalysis, raw } });
  } catch (error) {
    console.error('[AI Analyze] Failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: `分析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: error instanceof Error ? (error.stack || '') : '',
      },
      { status: 500 }
    );
  }
}
