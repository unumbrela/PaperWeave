import { NextResponse } from 'next/server';
import { getAIExplanation } from '@/lib/ai/explanation';
import { resolveKeys } from '@/lib/ai/keys';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;
    
    if (!text) {
      return NextResponse.json(
        { success: false, message: '缺少文本参数' },
        { status: 400 }
      );
    }
    
    const explanation = await getAIExplanation(text, resolveKeys(request));
    
    return NextResponse.json({
      success: true,
      data: explanation,
    });
  } catch (error) {
    console.error('AI 解释失败:', error);
    return NextResponse.json(
      { success: false, message: 'AI 解释失败' },
      { status: 500 }
    );
  }
}
