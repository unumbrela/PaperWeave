import { describe, it, expect } from "vitest";
import { parseLineage, buildRows } from "@/lib/genealogy/lineage";
import { buildLayout, relatives, ROW_H } from "@/lib/genealogy/layout";
import { toMarkdown, toSvgString } from "@/lib/genealogy/export";
import exampleLineage from "@/skills/research-genealogy/examples/generated-image-detection.json";

// 研究方向族谱：布局模型（layout.ts）与导出（export.ts）。

const example = parseLineage(JSON.stringify(exampleLineage));

describe("buildLayout", () => {
  it("行数与 buildRows 一致，坐标随行序与 depth 推导", () => {
    const rows = buildRows(example);
    const layout = buildLayout(example);
    expect(layout.rows).toHaveLength(rows.length);
    layout.rows.forEach((r, i) => {
      expect(r.y).toBe(i * ROW_H);
      expect(r.index).toBe(i);
      expect(r.dot.y).toBe(r.y + ROW_H / 2);
    });
  });

  it("主干连线数 = 带 relation 的行数（每个非根行一条入边）", () => {
    const layout = buildLayout(example);
    const nonRoot = layout.rows.filter((r) => r.relation).length;
    expect(layout.connectors).toHaveLength(nonRoot);
    // 每条连线两端都能在行里找到
    const ids = new Set(layout.rows.map((r) => r.node.id));
    for (const c of layout.connectors) {
      expect(ids.has(c.fromId)).toBe(true);
      expect(ids.has(c.toId)).toBe(true);
    }
  });

  it("时代带数 = 相邻聚合后的年份段，覆盖所有行", () => {
    const layout = buildLayout(example);
    const totalRows = layout.eraBands.reduce((s, b) => s + b.rows, 0);
    expect(totalRows).toBe(layout.rows.length);
    // 示例含 2018→2026，至少 6 个不同年份
    expect(new Set(layout.eraBands.map((b) => b.year)).size).toBeGreaterThanOrEqual(6);
  });

  it("parallel 连线对应原始 parallel 边（去重）", () => {
    const layout = buildLayout(example);
    const parEdges = example.edges.filter((e) => e.relation === "parallel").length;
    expect(layout.parallelLinks.length).toBeLessThanOrEqual(parEdges);
    expect(layout.parallelLinks.length).toBeGreaterThan(0);
  });
});

describe("relatives", () => {
  it("祖先/后代沿 tree 边可达，不含 parallel", () => {
    const kin = relatives(example);
    // wang2020 承自 marra2018 与 zhang2019
    const wang = kin.get("wang2020")!;
    expect(wang.ancestors.has("marra2018")).toBe(true);
    expect(wang.ancestors.has("zhang2019")).toBe(true);
    // marra2018 的后代里应包含 wang2020
    expect(kin.get("marra2018")!.descendants.has("wang2020")).toBe(true);
    // 自身不计入
    expect(wang.ancestors.has("wang2020")).toBe(false);
  });
});

describe("toMarkdown", () => {
  it("含方向标题与全部节点作者", () => {
    const md = toMarkdown(example);
    expect(md).toContain(example.field);
    for (const n of example.nodes) {
      expect(md).toContain(n.authors);
    }
  });
});

describe("toSvgString", () => {
  it("产出自包含 svg，含方向名与尺寸", () => {
    const svg = toSvgString(example);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");
    expect(svg).toMatch(/width="\d+" height="\d+"/);
  });
});
