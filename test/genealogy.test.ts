import { describe, it, expect } from "vitest";
import { parseLineage, buildRows, lineageStats } from "@/lib/genealogy/lineage";
import exampleLineage from "@/skills/research-genealogy/examples/generated-image-detection.json";

// 研究方向族谱：lineage.json（来自 skills/research-genealogy）的解析与树构建。

const make = (over: object = {}) =>
  JSON.stringify({
    field: "测试方向",
    nodes: [
      { id: "a", title: "A", authors: "Alice et al.", year: 2018, citations: 100 },
      { id: "b", title: "B", authors: "Bob et al.", year: 2020, citations: 50 },
      { id: "c", title: "C", authors: "Carol et al.", year: 2022, citations: 10 },
      { id: "d", title: "D", authors: "Dan et al.", year: 2021, citations: 30 },
    ],
    edges: [
      { from: "a", to: "b", relation: "builds-on", verified: "verified" },
      { from: "b", to: "c", relation: "builds-on" },
      { from: "a", to: "d", relation: "inspired-by" },
    ],
    ...over,
  });

describe("parseLineage", () => {
  it("合法 JSON 正常解析", () => {
    const l = parseLineage(make());
    expect(l.field).toBe("测试方向");
    expect(l.nodes).toHaveLength(4);
    expect(l.edges).toHaveLength(3);
  });

  it("非 JSON / 缺 nodes / 重复 id / 非法 relation / 悬空边均报错", () => {
    expect(() => parseLineage("not json")).toThrow("不是合法的 JSON");
    expect(() => parseLineage(JSON.stringify({ edges: [] }))).toThrow("nodes");
    expect(() =>
      parseLineage(
        make({
          nodes: [
            { id: "a", title: "A", authors: "x", year: 2020 },
            { id: "a", title: "A2", authors: "y", year: 2021 },
          ],
          edges: [],
        }),
      ),
    ).toThrow("重复");
    expect(() =>
      parseLineage(make({ edges: [{ from: "a", to: "b", relation: "fork" }] })),
    ).toThrow("不合法");
    expect(() =>
      parseLineage(make({ edges: [{ from: "a", to: "nope", relation: "builds-on" }] })),
    ).toThrow("不存在的节点");
  });
});

describe("buildRows", () => {
  it("DFS 顺序：根在前、子随父，depth 正确", () => {
    const rows = buildRows(parseLineage(make()));
    const ids = rows.map((r) => r.node.id);
    expect(ids).toEqual(["a", "b", "c", "d"]);
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 2, 1]);
    expect(rows[1].relation).toBe("builds-on");
    expect(rows[1].verified).toBe(true);
    expect(rows[3].relation).toBe("inspired-by");
  });

  it("多父节点取最近前驱为主干，其余父降为标注", () => {
    const rows = buildRows(
      parseLineage(
        make({
          edges: [
            { from: "a", to: "c", relation: "builds-on" }, // 远祖 2018
            { from: "b", to: "c", relation: "builds-on" }, // 最近前驱 2020
          ],
        }),
      ),
    );
    const c = rows.find((r) => r.node.id === "c")!;
    const b = rows.find((r) => r.node.id === "b")!;
    expect(c.depth).toBe(b.depth + 1); // 挂在 b 下
    expect(c.extraParents).toEqual([{ relation: "builds-on", authors: "Alice et al." }]);
  });

  it("parallel 边不参与层级，双向标注", () => {
    const rows = buildRows(
      parseLineage(make({ edges: [{ from: "b", to: "d", relation: "parallel" }] })),
    );
    expect(rows.every((r) => r.depth === 0)).toBe(true); // 没有树边
    expect(rows.find((r) => r.node.id === "b")!.parallels).toEqual(["Dan et al."]);
    expect(rows.find((r) => r.node.id === "d")!.parallels).toEqual(["Bob et al."]);
  });

  it("有环不死循环，节点不丢", () => {
    const rows = buildRows(
      parseLineage(
        make({
          edges: [
            { from: "a", to: "b", relation: "builds-on" },
            { from: "b", to: "a", relation: "builds-on" }, // 环
          ],
        }),
      ),
    );
    expect(rows).toHaveLength(4);
  });

  it("角色标记：根带子=founder，近两年=frontier", () => {
    const rows = buildRows(parseLineage(make()));
    expect(rows.find((r) => r.node.id === "a")!.role).toBe("founder");
    expect(rows.find((r) => r.node.id === "c")!.role).toBe("frontier"); // maxYear-1 内
  });
});

describe("lineageStats", () => {
  it("统计年份跨度与验证边数", () => {
    const s = lineageStats(parseLineage(make()));
    expect(s).toEqual({
      count: 4,
      minYear: 2018,
      maxYear: 2022,
      verifiedEdges: 1,
      totalTreeEdges: 3,
    });
  });
});

describe("vendored 真实示例（skill 产物 ↔ 站内渲染器的契约）", () => {
  it("generated-image-detection.json 可解析且节点全部入树", () => {
    const l = parseLineage(JSON.stringify(exampleLineage));
    const rows = buildRows(l);
    expect(l.nodes.length).toBeGreaterThanOrEqual(10);
    expect(rows).toHaveLength(l.nodes.length); // 不丢节点
    expect(rows.some((r) => r.depth >= 2)).toBe(true); // 不是星型，链条 ≥3 层
    expect(lineageStats(l).verifiedEdges).toBeGreaterThan(0);
  });
});
