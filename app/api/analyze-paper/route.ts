import { NextResponse } from 'next/server';
import { callAnalysis, ANALYSIS_OUTPUT_SPEC } from '@/lib/ai/analyze';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, abstract, authors } = body;

    console.log('[Analyze Paper API] Analyzing:', title);

    if (!title && !abstract) {
      return NextResponse.json(
        { success: false, error: '需要提供论文标题或摘要' },
        { status: 400 }
      );
    }

    if (!process.env.DEEPSEEK_API_KEY && !process.env.OPENAI_API_KEY && !process.env.GOOGLE_API_KEY) {
      console.error('[Analyze Paper API] No AI provider key is set');
      return NextResponse.json(
        { success: false, error: 'AI 服务未配置' },
        { status: 500 }
      );
    }

    const prompt = `任务说明：请基于下列论文标题/作者/摘要，提取结构化信息并以严格 JSON 返回。\n\n论文标题：${title || '未提供'}\n作者：${authors || '未提供'}\n摘要：${abstract || '未提供'}\n\n${ANALYSIS_OUTPUT_SPEC}\n\n请严格只返回 JSON。`;

    const result = await callAnalysis(prompt);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[Analyze Paper API] Error:', error);

    let errorMessage = '分析失败';
    let details = '';

    if (error instanceof Error) {
      errorMessage = error.message;
      details = error.stack || '';

      if (errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
        errorMessage = '无法连接到 AI 服务，请检查网络连接';
      } else if (errorMessage.includes('API key') || errorMessage.includes('Unauthorized')) {
        errorMessage = 'AI API Key 无效或未设置';
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: details,
      },
      { status: 500 }
    );
  }
}
