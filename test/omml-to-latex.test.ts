import { describe, it, expect } from 'vitest';
import { ommlToLatex } from '@/lib/omml-to-latex';

describe('ommlToLatex', () => {
  it('分数 m:f → \\frac', () => {
    const xml = `
      <m:f xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
        <m:num><m:r><m:t>a</m:t></m:r></m:num>
        <m:den><m:r><m:t>b</m:t></m:r></m:den>
      </m:f>`;
    expect(ommlToLatex(xml).replace(/\s+/g, '')).toBe('\\frac{a}{b}');
  });

  it('上标 m:sSup → ^', () => {
    const xml = `
      <m:sSup xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
        <m:e><m:r><m:t>x</m:t></m:r></m:e>
        <m:sup><m:r><m:t>2</m:t></m:r></m:sup>
      </m:sSup>`;
    expect(ommlToLatex(xml).replace(/\s+/g, '')).toBe('{x}^{2}');
  });

  it('根号 m:rad → \\sqrt', () => {
    const xml = `
      <m:rad xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
        <m:e><m:r><m:t>y</m:t></m:r></m:e>
      </m:rad>`;
    expect(ommlToLatex(xml).replace(/\s+/g, '')).toBe('\\sqrt{y}');
  });

  it('希腊字母与运算符通过符号表映射', () => {
    const xml = `
      <m:r xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
        <m:t>α≤β</m:t>
      </m:r>`;
    const out = ommlToLatex(xml);
    expect(out).toContain('\\alpha');
    expect(out).toContain('\\le');
    expect(out).toContain('\\beta');
  });

  it('空输入返回空串', () => {
    expect(ommlToLatex('').trim()).toBe('');
  });
});
