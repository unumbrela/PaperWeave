import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  TOOLS,
  PHASES,
  WORKFLOW_PHASES,
  getTool,
  getToolsInPhase,
} from '@/lib/tools-registry';

// 注册表是全站工具的「单一事实源」（README/PROJECT-SUMMARY），
// 这些不变量一旦被破坏，过滤/搜索/路由会静默错位 —— 用测试钉死。
describe('tools-registry 不变量', () => {
  it('至少有一个工具', () => {
    expect(TOOLS.length).toBeGreaterThan(0);
  });

  it('slug 全局唯一', () => {
    const slugs = TOOLS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('每个工具关键字段非空', () => {
    for (const t of TOOLS) {
      expect(t.slug, `slug of ${t.name}`).toBeTruthy();
      expect(t.name, `name of ${t.slug}`).toBeTruthy();
      expect(t.description, `description of ${t.slug}`).toBeTruthy();
      expect(t.icon, `icon of ${t.slug}`).toBeTruthy();
      expect(t.gradient, `gradient of ${t.slug}`).toBeTruthy();
      expect(t.href, `href of ${t.slug}`).toBeTruthy();
      expect(t.phases.length, `phases of ${t.slug}`).toBeGreaterThan(0);
    }
  });

  it('每个工具的 phases 都是合法阶段', () => {
    const valid = new Set(WORKFLOW_PHASES);
    for (const t of TOOLS) {
      for (const p of t.phases) {
        expect(valid.has(p), `${t.slug} 含非法阶段 ${p}`).toBe(true);
      }
    }
  });

  it('指向 /tools/<slug> 的工具确有对应页面文件', () => {
    for (const t of TOOLS) {
      const m = t.href.match(/^\/tools\/([^/]+)$/);
      if (!m) continue; // 外链或其它路由不校验
      const slug = m[1];
      const page = resolve(process.cwd(), 'app/tools', slug, 'page.tsx');
      expect(existsSync(page), `缺少页面 app/tools/${slug}/page.tsx`).toBe(true);
    }
  });

  it('PHASES = 「全部」+ 7 环主线', () => {
    expect(PHASES[0]).toBe('全部');
    expect(PHASES.slice(1)).toEqual(WORKFLOW_PHASES);
  });

  it('每个主线阶段至少挂着一个工具', () => {
    for (const phase of WORKFLOW_PHASES) {
      expect(getToolsInPhase(phase).length, `${phase} 无工具`).toBeGreaterThan(0);
    }
  });

  it('getTool 命中 / 未命中行为正确', () => {
    expect(getTool(TOOLS[0].slug)).toEqual(TOOLS[0]);
    expect(getTool('definitely-not-a-tool')).toBeUndefined();
  });
});
