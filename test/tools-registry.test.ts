import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  TOOLS,
  PHASES,
  WORKFLOW_PHASES,
  getTool,
  getToolsInPhase,
  getWorkflowTools,
  getGalleryTools,
  getLabTools,
  getUtilityTools,
  getSupportingTools,
  CORE_FLOW,
  CORE_FLOW_SLUGS,
  getUpstreamTool,
  getDownstreamTool,
  getPhaseLeadTool,
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
      expect(['workflow', 'utility', 'gallery', 'lab'], `track of ${t.slug}`).toContain(t.track);
    }
  });

  it('workflow 工具挂在 6 环主线；utility / gallery / lab 工具不属于任何工作流阶段', () => {
    const valid = new Set(WORKFLOW_PHASES);
    for (const t of TOOLS) {
      if (t.track === 'workflow') {
        // 工作流工具必须挂至少一个阶段，且全部合法
        expect(t.phases.length, `workflow 工具 ${t.slug} 无阶段`).toBeGreaterThan(0);
        for (const p of t.phases) {
          expect(valid.has(p), `${t.slug} 含非法阶段 ${p}`).toBe(true);
        }
      } else {
        // 展厅 / lab 工具不参与阶段过滤，phases 必须为空
        expect(t.phases.length, `${t.track} 工具 ${t.slug} 不应挂阶段`).toBe(0);
      }
    }
  });

  it('getWorkflowTools / getUtilityTools / getGalleryTools / getLabTools 完整划分 TOOLS', () => {
    const wf = getWorkflowTools();
    const util = getUtilityTools();
    const gal = getGalleryTools();
    const lab = getLabTools();
    expect(wf.length + util.length + gal.length + lab.length).toBe(TOOLS.length);
    expect(wf.every((t) => t.track === 'workflow')).toBe(true);
    expect(util.every((t) => t.track === 'utility')).toBe(true);
    expect(gal.every((t) => t.track === 'gallery')).toBe(true);
    expect(lab.every((t) => t.track === 'lab')).toBe(true);
    expect(util.length, '应保留至少一个外围工具').toBeGreaterThan(0);
    expect(gal.length, '应保留至少一个展厅工具').toBeGreaterThan(0);
    expect(lab.length, '应保留至少一个 lab 工具').toBeGreaterThan(0);
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

  it('PHASES = 「全部」+ 6 环主线', () => {
    expect(PHASES[0]).toBe('全部');
    expect(PHASES.slice(1)).toEqual(WORKFLOW_PHASES);
    expect(WORKFLOW_PHASES).toHaveLength(6);
    expect(WORKFLOW_PHASES).toContain('梳理');
    // 讲结果 / 可视化表达 已从工作流剥离
    expect(WORKFLOW_PHASES).not.toContain('讲结果' as never);
    expect(WORKFLOW_PHASES).not.toContain('可视化表达' as never);
  });

  it('每个主线阶段至少挂着一个工具', () => {
    for (const phase of WORKFLOW_PHASES) {
      expect(getToolsInPhase(phase).length, `${phase} 无工具`).toBeGreaterThan(0);
    }
  });

  describe('CORE_FLOW（首页核心论文流程）', () => {
    it('每步字段非空，工具步的 toolSlug 命中真实工具且 href 一致', () => {
      expect(CORE_FLOW.length).toBeGreaterThanOrEqual(5);
      for (const step of CORE_FLOW) {
        expect(step.title, 'title').toBeTruthy();
        expect(step.blurb, `blurb of ${step.title}`).toBeTruthy();
        expect(step.href, `href of ${step.title}`).toBeTruthy();
        expect(step.icon, `icon of ${step.title}`).toBeTruthy();
        if (step.toolSlug) {
          const tool = getTool(step.toolSlug);
          expect(tool, `core step ${step.title} 指向不存在的工具 ${step.toolSlug}`).toBeDefined();
          expect(tool!.href).toBe(step.href); // href 与注册表一致，避免漂移
          expect(tool!.track).toBe('workflow');
        }
      }
    });

    it('CORE_FLOW_SLUGS = 各步 toolSlug，且唯一', () => {
      expect(new Set(CORE_FLOW_SLUGS).size).toBe(CORE_FLOW_SLUGS.length);
      expect(CORE_FLOW_SLUGS.every((s) => !!getTool(s))).toBe(true);
    });

    it('配套工具 = workflow 工具 - 核心流程工具（完整划分，不重不漏）', () => {
      const supporting = getSupportingTools();
      const wf = getWorkflowTools();
      expect(supporting.length + CORE_FLOW_SLUGS.length).toBe(wf.length);
      // 配套工具不含任何核心流程工具
      expect(supporting.some((t) => CORE_FLOW_SLUGS.includes(t.slug))).toBe(false);
      expect(supporting.every((t) => t.track === 'workflow')).toBe(true);
    });
  });

  it('getTool 命中 / 未命中行为正确', () => {
    expect(getTool(TOOLS[0].slug)).toEqual(TOOLS[0]);
    expect(getTool('definitely-not-a-tool')).toBeUndefined();
  });

  describe('链路位置推导（6 环闭环可视化）', () => {
    it('每环都有代表工具', () => {
      for (const phase of WORKFLOW_PHASES) {
        expect(getPhaseLeadTool(phase), `${phase} 无代表工具`).toBeDefined();
      }
    });

    it('首环无上游、末环无下游；中间环上下游自洽', () => {
      const first = getPhaseLeadTool(WORKFLOW_PHASES[0])!;
      const last = getPhaseLeadTool(WORKFLOW_PHASES[WORKFLOW_PHASES.length - 1])!;
      expect(getUpstreamTool(first.slug)).toBeUndefined();
      expect(getDownstreamTool(last.slug)).toBeUndefined();

      // 每个 workflow 工具的上/下游（若存在）都应是合法 workflow 工具，
      // 且其主环序号严格在本工具主环之前/之后。
      for (const t of getWorkflowTools()) {
        const idx = WORKFLOW_PHASES.indexOf(t.phases[0]);
        const up = getUpstreamTool(t.slug);
        const down = getDownstreamTool(t.slug);
        if (up) {
          expect(up.track).toBe('workflow');
          expect(WORKFLOW_PHASES.indexOf(up.phases[0])).toBeLessThan(idx);
        }
        if (down) {
          expect(down.track).toBe('workflow');
          expect(WORKFLOW_PHASES.indexOf(down.phases[0])).toBeGreaterThan(idx);
        }
      }
    });

    it('gallery 工具不参与链路', () => {
      for (const t of getGalleryTools()) {
        expect(getUpstreamTool(t.slug)).toBeUndefined();
        expect(getDownstreamTool(t.slug)).toBeUndefined();
      }
    });
  });
});
