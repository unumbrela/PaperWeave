import { describe, it, expect } from "vitest";
import { computeStats } from "@/lib/library-stats/stats";
import type { Paper, Annotation, AnnotationType } from "@/lib/db/types";

const paper = (over: Partial<Paper>): Paper => ({
  id: Math.random().toString(36).slice(2),
  title: "T",
  authors: [],
  sourceType: "ARXIV",
  tags: [],
  citations: 0,
  createdAt: "2024-03-10T00:00:00Z",
  ...over,
});

const anno = (type: AnnotationType): Annotation => ({
  id: Math.random().toString(36).slice(2),
  paperId: "p",
  page: 0,
  rects: [],
  selectedText: "",
  type,
  color: "#000",
  createdAt: "2024-01-01",
});

describe("computeStats", () => {
  const papers = [
    paper({ sourceType: "ARXIV", publishedAt: "2021-05-01", tags: ["arxiv", "CV", "NLP"], citations: 100, createdAt: "2024-01-05" }),
    paper({ sourceType: "ARXIV", publishedAt: "2021-06-01", tags: ["arxiv", "CV"], citations: 50, createdAt: "2024-02-05" }),
    paper({ sourceType: "LOCAL", publishedAt: "2023-01-01", tags: ["CV"], citations: 0, notes: "有笔记", createdAt: "2024-02-20" }),
  ];
  const annos = [anno("highlight"), anno("highlight"), anno("insight")];
  const stats = computeStats(papers, annos);

  it("总量统计", () => {
    expect(stats.total).toBe(3);
    expect(stats.totalCitations).toBe(150);
    expect(stats.totalAnnotations).toBe(3);
    expect(stats.totalNotes).toBe(1);
  });

  it("来源分布（label 映射 + 降序）", () => {
    expect(stats.bySource[0]).toEqual({ label: "arXiv", count: 2 });
    expect(stats.bySource[1]).toEqual({ label: "本地", count: 1 });
  });

  it("按年份升序聚合", () => {
    expect(stats.byYear).toEqual([
      { label: "2021", count: 2 },
      { label: "2023", count: 1 },
    ]);
  });

  it("按月入库升序", () => {
    expect(stats.byMonth).toEqual([
      { label: "2024-01", count: 1 },
      { label: "2024-02", count: 2 },
    ]);
  });

  it("主题标签 top（剔除来源标记 arxiv，按计数降序）", () => {
    expect(stats.topTags).toEqual([
      { tag: "CV", count: 3 },
      { tag: "NLP", count: 1 },
    ]);
  });

  it("批注分类固定四类、含 0 计数", () => {
    expect(stats.byAnnotationType).toEqual([
      { type: "highlight", count: 2 },
      { type: "insight", count: 1 },
      { type: "todo", count: 0 },
      { type: "transferable", count: 0 },
    ]);
  });

  it("被引最高（剔除 0 引用、降序、≤5）", () => {
    expect(stats.topCited.map((c) => c.citations)).toEqual([100, 50]);
  });

  it("空库安全", () => {
    const empty = computeStats([], []);
    expect(empty.total).toBe(0);
    expect(empty.bySource).toEqual([]);
    expect(empty.topCited).toEqual([]);
  });
});
