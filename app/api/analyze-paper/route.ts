import { NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/ai/client';

console.log('[Analyze Paper API] Config:', { hasOpenAI: !!process.env.OPENAI_API_KEY, hasDeepSeek: !!process.env.DEEPSEEK_API_KEY });

export async function POST(request: Request) {
  console.log('[Analyze Paper API] Request received');
  
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
    
    if (!process.env.DEEPSEEK_API_KEY && !process.env.OPENAI_API_KEY) {
      console.error('[Analyze Paper API] No AI provider key is set');
      return NextResponse.json(
        { success: false, error: 'AI 服务未配置' },
        { status: 500 }
      );
    }

    const prompt = `任务说明：请基于下列论文标题/作者/摘要，提取结构化信息并以严格 JSON 返回（仅返回 JSON，无额外文字）。\n\n论文标题：${title || '未提供'}\n作者：${authors || '未提供'}\n摘要：${abstract || '未提供'}\n\n输出字段（必须遵守）：{\n  "keywords": ["..."],\n  "summary": "...",\n  "methodology": "...",\n  "contributions": ["..."],\n  "applications": ["..."],\n  "limitations": ["..."],\n  "confidence": 0.0\n}\n- keywords: 3-7 个关键词（数组）\n- summary: 1-3 句概述（字符串）\n- methodology: 方法/技术概要（字符串）\n- contributions: 2-3 条贡献（数组）\n- applications: 应用领域（数组）\n- limitations: 可选的局限（数组）\n- confidence: 0-1 数字，表示模型对提取结果的置信度\n\n示例输出：{ "keywords":["volume rendering"], "summary":"...", "methodology":"...", "contributions":["..."], "applications":["..."], "limitations":[], "confidence":0.8 }\n\n请根据输入语言输出（若输入为中文，返回中文），并严格只返回 JSON。`;
    
    console.log('[Analyze Paper API] Sending request to AI provider');

    const result = await chatCompletion([
      { role: 'system', content: '你是一位专业的学术研究助手，擅长分析论文并提取关键信息。请用简洁明了的语言输出分析结果。' },
      { role: 'user', content: prompt },
    ], { model: process.env.DEEPSEEK_API_KEY ? 'deepseek-chat' : undefined, temperature: 0.3, max_tokens: 1000 });
    
    console.log('[Analyze Paper API] Analysis complete');
    
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
        details: details 
      }, 
      { status: 500 }
    );
  }
}
