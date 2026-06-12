/**
 * 从 LLM 返回文本中提取「字符串 → 字符串」的 JSON 对象。
 * 容忍 ```json 围栏与前后杂文（LLM 偶尔会加说明文字）；
 * 非字符串 / 空白 value 一律丢弃。解析不出返回 null。
 */
export function extractJsonStringMap(text: string): Record<string, string> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string' && v.trim()) out[k] = v.trim();
      }
      return out;
    }
  } catch {
    // 解析失败走 null，调用方报错
  }
  return null;
}
