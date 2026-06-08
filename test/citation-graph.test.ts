import { describe, it, expect } from "vitest";
import {
  buildGraph,
  stripOpenAlexId,
  type OAWork,
} from "@/lib/paper-search/citation-graph";

const work = (id: string, extra: Partial<OAWork> = {}): OAWork => ({
  id: `https://openalex.org/${id}`,
  title: `Paper ${id}`,
  publication_year: 2023,
  cited_by_count: 10,
  ...extra,
});

describe("stripOpenAlexId", () => {
  it("剥离 url 前缀", () => {
    expect(stripOpenAlexId("https://openalex.org/W123")).toBe("W123");
    expect(stripOpenAlexId("http://openalex.org/W9")).toBe("W9");
  });
  it("已是裸 id 原样返回", () => {
    expect(stripOpenAlexId("W123")).toBe("W123");
  });
  it("空值安全", () => {
    expect(stripOpenAlexId("")).toBe("");
  });
});

describe("buildGraph", () => {
  const seed = work("W1", { title: "Seed" });

  it("种子 + 参考文献：边为 种子→引文", () => {
    const g = buildGraph(seed, [work("W2"), work("W3")], []);
    expect(g.seedId).toBe("W1");
    expect(g.nodes).toHaveLength(3);
    expect(g.edges).toEqual([
      { source: "W1", target: "W2" },
      { source: "W1", target: "W3" },
    ]);
    expect(g.nodes.find((n) => n.id === "W1")?.relation).toBe("seed");
    expect(g.nodes.find((n) => n.id === "W2")?.relation).toBe("reference");
  });

  it("被引文献：边为 施引→种子", () => {
    const g = buildGraph(seed, [], [work("W9")]);
    expect(g.edges).toEqual([{ source: "W9", target: "W1" }]);
    expect(g.nodes.find((n) => n.id === "W9")?.relation).toBe("citation");
  });

  it("节点按 id 去重（同一篇既在引用又在被引只留一个，种子优先）", () => {
    const g = buildGraph(seed, [work("W2"), work("W2")], [work("W1")]);
    const ids = g.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(["W1", "W2"]);
    // 种子不会被 citation 中的 W1 覆盖
    expect(g.nodes.find((n) => n.id === "W1")?.relation).toBe("seed");
  });

  it("边去重（重复引用同一篇只留一条边）", () => {
    const g = buildGraph(seed, [work("W2"), work("W2")], []);
    expect(g.edges).toHaveLength(1);
  });

  it("丢弃无 id 的 work，不产生空节点", () => {
    const g = buildGraph(seed, [work("W2"), { title: "no id" }], []);
    expect(g.nodes.map((n) => n.id)).toEqual(["W1", "W2"]);
  });

  it("剔除与种子无连接的孤立节点", () => {
    // 没有任何引用/被引关系 → 只剩种子
    const g = buildGraph(seed, [], []);
    expect(g.nodes).toHaveLength(1);
    expect(g.nodes[0].id).toBe("W1");
  });

  it("提取首作者与被引数", () => {
    const g = buildGraph(
      seed,
      [work("W2", { authorships: [{ author: { display_name: "Ada Lovelace" } }], cited_by_count: 42 })],
      [],
    );
    const n = g.nodes.find((x) => x.id === "W2")!;
    expect(n.author).toBe("Ada Lovelace");
    expect(n.citations).toBe(42);
    expect(n.url).toBe("https://openalex.org/W2");
  });
});
