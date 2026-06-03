import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { chatCompletion } from '@/lib/ai/client';
import prisma from '@/lib/db/prisma';

interface AIAnalysisResult {
  problem: string;
  method: string;
  contribution: string;
  application: string;
}

function toPaperAnalysis(result: AIAnalysisResult) {
  return {
    summary: result.problem,
    methodology: result.method,
    contribution: result.contribution,
    notes: `应用方向：${result.application}`,
  };
}

const getPapersDir = () => {
  const dir = path.join(process.cwd(), 'public', 'papers');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const loadPapersFromFiles = (): any[] => {
  const dir = path.join(process.cwd(), 'data', 'papers');
  const papers: any[] = [];
  
  try {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          const filePath = path.join(dir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          papers.push(JSON.parse(content));
        }
      });
    }
  } catch (error) {
    console.warn(`Failed to load papers from files: ${error}`);
  }
  
  return papers;
};

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
        reader.parseBuffer(buffer, (err: any, item: any) => {
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
        const papers = loadPapersFromFiles();
        paper = papers.find(p => p.id === paperId);
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

    const prompt = `任务说明：请从给定的论文摘要或文本中提取关键信息，并以机器可解析的严格 JSON 返回。\n\n输入文本：\n${contentToAnalyze}\n\n要求：\n- 仅输出一段合法 JSON（不允许任何额外说明或 markdown）。\n- 输出字段及格式（必须遵守）：{\n  "keywords": ["..."],            // 3-7 个关键词（数组）\n  "summary": "...",             // 1-3 句的论文概述（字符串）\n  "methodology": "...",         // 方法/技术概要（字符串）\n  "contributions": ["..."],     // 2-3 个主要贡献点（数组）\n  "applications": ["..."],      // 研究可应用的领域或场景（数组）\n  "limitations": ["..."],       //（可选）已识别的局限或开放问题（数组）\n  "confidence": 0.0              // 0-1 的置信度估计（数字）\n}\n- 如果某字段无法提取，请用空字符串或空数组表示（例如："summary":"" 或 "contributions":[]）。\n- 保持输出语言与输入一致（若输入含中文，请用中文输出）。\n- 请尽量把每个字段控制在简洁长度（summary 不超过 3 句，keywords 最多 7 个词）。\n\n示例返回：\n{\n  "keywords": ["volume rendering","ray casting","shear-warp"],\n  "summary": "本文综述了直接体渲染（DVR）的关键技术，比较了 ray casting 和 shear-warp 等方法，并讨论了性能权衡。",\n  "methodology": "分析和比较常见体渲染算法的实现细节与复杂度，基于文献归纳方法优缺点。",\n  "contributions": ["整理并比较主要 DVR 算法","提出性能优化思路"],\n  "applications": ["医学影像","科学可视化"],\n  "limitations": ["未提供新的实验结果"],\n  "confidence": 0.75\n}\n\n请严格输出 JSON，立即开始处理。`;

    const raw = await chatCompletion([
      { role: 'system', content: '你是一个严谨的学术助手，输出应为机器可解析的 JSON。' },
      { role: 'user', content: prompt },
    ], { model: process.env.DEEPSEEK_API_KEY ? 'deepseek-chat' : undefined, temperature: 0.2, max_tokens: 1000 });

    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      // 尝试从文本中抽取第一个 JSON 对象
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch (e2) {
          parsed = null;
        }
      }
    }

    const paperAnalysis = parsed ? {
      summary: parsed.summary || '',
      methodology: parsed.methodology || '',
      contribution: parsed.contribution || '',
      notes: `关键词：${(parsed.keywords || []).join(', ')}；应用：${(parsed.applications || []).join(', ')}`,
    } : {
      summary: '未分析成功',
      methodology: '未分析成功',
      contribution: '未分析成功',
      notes: '未分析成功',
    };

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
        const papers = loadPapersFromFiles();
        const paper = papers.find((item) => item.id === paperId);
        if (paper) {
          const dir = path.join(process.cwd(), 'data', 'papers');
          const filePath = path.join(dir, `${paperId}.json`);
          fs.writeFileSync(
            filePath,
            JSON.stringify(
              {
                ...paper,
                ...paperAnalysis,
                updatedAt: new Date().toISOString(),
              },
              null,
              2,
            ),
          );
        }
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
