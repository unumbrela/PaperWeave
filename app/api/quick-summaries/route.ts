import { NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/ai/client';
import { resolveKeys, hasAnyKey } from '@/lib/ai/keys';

// 检索结果「一键速览」—— 把一页检索结果（标题 + 摘要）打包成一次 LLM 调用，
// 为每篇生成「一句话简介 + 方向定位」。批量一次调用而非逐篇请求，省 token 也省延迟。
// 走 chatCompletion 的 DeepSeek → OpenAI → Gemini 三级 fallback，支持访客自带 key。

/** 每篇的速览：summary=一句话做了什么；position=在该方向里的位置。 */
interface PaperGlance {
  summary: string;
  position?: string;
}

/**
 * 从 LLM 文本提取「id → {summary, position}」对象映射。
 * 容忍 ```json 围栏与前后杂文；兼容旧格式（value 为字符串时当作 summary）。
 */
function extractGlanceMap(text: string): Record<string, PaperGlance> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const out: Record<string, PaperGlance> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string' && v.trim()) {
        out[k] = { summary: v.trim() };
      } else if (v && typeof v === 'object') {
        const obj = v as { summary?: unknown; position?: unknown };
        const summary = typeof obj.summary === 'string' ? obj.summary.trim() : '';
        const position = typeof obj.position === 'string' ? obj.position.trim() : undefined;
        if (summary) out[k] = { summary, position: position || undefined };
      }
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

/** 单次最多总结的论文篇数（防 prompt 过长 / 滥用） */
const MAX_PAPERS = 30;

interface PaperInput {
  id: string;
  title: string;
  abstract?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const papers: PaperInput[] = Array.isArray(body?.papers) ? body.papers : [];

    const valid = papers
      .filter((p) => p && typeof p.id === 'string' && typeof p.title === 'string' && p.title.trim())
      .slice(0, MAX_PAPERS);

    if (valid.length === 0) {
      return NextResponse.json(
        { success: false, error: '需要提供至少一篇论文（id + title）' },
        { status: 400 },
      );
    }

    const keys = resolveKeys(request);
    if (!hasAnyKey(keys)) {
      return NextResponse.json(
        { success: false, error: 'AI 服务未配置：请在右上角「API Key」填入你自己的 key' },
        { status: 503 },
      );
    }

    const list = valid
      .map((p, i) => {
        const abs = p.abstract ? p.abstract.slice(0, 1200) : '（无摘要）';
        return `${i + 1}. [id: ${p.id}]\n标题：${p.title}\n摘要：${abs}`;
      })
      .join('\n\n');

    const prompt = `下面是 ${valid.length} 篇论文的标题与摘要。请为每篇生成两项中文内容：
- summary：一句话简介（30-60 字），点明它做了什么、核心方法或结论，避免照抄标题；
- position：一句话方向定位（15-40 字），说明它在所属研究方向里的位置——属于哪个子方向、相对主流方法主打什么、是奠基性工作还是在已有方法上的改进。

${list}

请严格只返回一个 JSON 对象：key 为论文 id（与输入完全一致），value 为 {"summary": "...", "position": "..."}。不要输出任何其他内容。`;

    const raw = await chatCompletion(
      [
        { role: 'system', content: '你是一名精炼的论文速览助手，输出严格遵循 JSON 格式要求。' },
        { role: 'user', content: prompt },
      ],
      // 30 篇 × (简介 + 定位)，留足余量
      { temperature: 0.3, max_tokens: 6000 },
      keys,
    );

    const glances = extractGlanceMap(raw);
    if (!glances || Object.keys(glances).length === 0) {
      return NextResponse.json(
        { success: false, error: 'AI 返回格式异常，请重试' },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, data: glances });
  } catch (error) {
    console.error('[Quick Summaries API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '速览失败' },
      { status: 500 },
    );
  }
}
