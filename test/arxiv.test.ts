import { describe, it, expect } from 'vitest';
import { parseArxivId, generatePdfFileName } from '@/lib/services/arxiv';

describe('parseArxivId', () => {
  it('接受裸 ID', () => {
    expect(parseArxivId('2401.12345')).toBe('2401.12345');
  });

  it('剥离 arxiv: 前缀', () => {
    expect(parseArxivId('arxiv:2401.12345')).toBe('2401.12345');
    expect(parseArxivId('arXiv:2401.12345')).toBe('2401.12345');
  });

  it('从 abs URL 提取 ID', () => {
    expect(parseArxivId('https://arxiv.org/abs/2401.12345')).toBe('2401.12345');
  });

  it('从 pdf URL（带 .pdf 后缀）提取 ID', () => {
    expect(parseArxivId('https://arxiv.org/pdf/2401.12345.pdf')).toBe('2401.12345');
  });

  it('容忍首尾空白', () => {
    expect(parseArxivId('  2401.12345  ')).toBe('2401.12345');
  });

  it('非法格式抛错', () => {
    expect(() => parseArxivId('not-an-id')).toThrow();
    expect(() => parseArxivId('')).toThrow();
    expect(() => parseArxivId('12345')).toThrow();
  });
});

describe('generatePdfFileName', () => {
  it('清洗标题为安全文件名', () => {
    const name = generatePdfFileName('2401.12345', 'Attention Is All You Need!');
    expect(name).toBe('2401.12345_attention-is-all-you-need.pdf');
  });

  it('标题超长时截断到 50 字符', () => {
    const long = 'a'.repeat(120);
    const name = generatePdfFileName('1.1', long);
    const titlePart = name.replace('1.1_', '').replace('.pdf', '');
    expect(titlePart.length).toBeLessThanOrEqual(50);
  });

  it('剔除非字母数字字符', () => {
    expect(generatePdfFileName('1.1', 'A/B: C*D')).toBe('1.1_ab-cd.pdf');
  });
});
