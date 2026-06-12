import { describe, it, expect } from 'vitest';
import { extractJsonStringMap as extractJson } from '@/lib/ai/extract-json';

// 「一键速览」对 LLM 返回的容错解析：LLM 偶尔会加 ``` 围栏或前后说明文字，
// extractJsonStringMap 必须把里面的 {id: summary} 对象稳定挖出来。

describe('quick-summaries extractJsonStringMap', () => {
  it('解析裸 JSON 对象', () => {
    expect(extractJson('{"a": "总结A", "b": "总结B"}')).toEqual({ a: '总结A', b: '总结B' });
  });

  it('容忍 ```json 围栏', () => {
    expect(extractJson('```json\n{"x": "一句话"}\n```')).toEqual({ x: '一句话' });
  });

  it('容忍前后杂文', () => {
    expect(extractJson('好的，结果如下：\n{"p1": "总结"}\n以上。')).toEqual({ p1: '总结' });
  });

  it('丢弃非字符串与空白 value', () => {
    expect(extractJson('{"a": "ok", "b": 42, "c": "  "}')).toEqual({ a: 'ok' });
  });

  it('无 JSON / 数组 / 解析失败时返回 null', () => {
    expect(extractJson('没有任何 JSON')).toBeNull();
    expect(extractJson('["不是对象"]')).toBeNull();
    expect(extractJson('{"坏掉的: }')).toBeNull();
  });
});
