import { NextResponse } from 'next/server';
import { callAnalysis, parseAnalysis, toPaperFields, ANALYSIS_OUTPUT_SPEC } from '@/lib/ai/analyze';
import { resolveKeys, hasAnyKey } from '@/lib/ai/keys';

// 无状态 AI 助手：传入论文文本，返回结构化分析。结果由客户端写入本地 Dexie
// （单一真相源），服务端不落盘、不读盘、不连数据库——与全站本地优先架构一致。
// （历史上这里还有一条 Prisma + 读取 public/<pdfPath> 的分支，既无前端调用、又存在
//  路径穿越读任意文件的隐患，已移除。）

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { success: false, message: '请提供要分析的文本内容' },
        { status: 400 },
      );
    }

    const keys = resolveKeys(request);
    if (!hasAnyKey(keys)) {
      return NextResponse.json(
        { success: false, message: 'AI 服务未配置：请在右上角「API Key」填入你自己的 key' },
        { status: 503 },
      );
    }

    const contentToAnalyze = text.slice(0, 5000);
    const prompt = `任务说明：请从给定的论文摘要或文本中提取关键信息，并以机器可解析的严格 JSON 返回。\n\n输入文本：\n${contentToAnalyze}\n\n${ANALYSIS_OUTPUT_SPEC}\n\n请严格输出 JSON，立即开始处理。`;

    const raw = await callAnalysis(prompt, keys);
    const parsed = parseAnalysis(raw);

    // 解析失败时如实报错，绝不返回「未分析成功」占位字段——
    // 否则客户端会把垃圾数据持久化进本地库，覆盖真实笔记位。
    if (!parsed) {
      return NextResponse.json(
        { success: false, message: 'AI 输出无法解析为结构化结果，请重试', raw },
        { status: 422 },
      );
    }

    return NextResponse.json({
      success: true,
      message: '分析完成',
      data: { ...toPaperFields(parsed), raw },
    });
  } catch (error) {
    console.error('[AI Analyze] Failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: `分析失败: ${error instanceof Error ? error.message : '未知错误'}`,
      },
      { status: 500 },
    );
  }
}
