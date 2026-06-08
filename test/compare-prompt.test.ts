import { describe, it, expect } from "vitest";
import { buildComparePrompt, paperContext, COMPARE_DIMENSIONS } from "@/lib/compare/prompt";
import type { Paper } from "@/lib/db/types";

const mk = (over: Partial<Paper>): Paper => ({
  id: "x",
  title: "T",
  authors: [{ name: "Jane Doe" }],
  sourceType: "LOCAL",
  tags: [],
  citations: 0,
  createdAt: "2024-01-01",
  ...over,
});

describe("paperContext", () => {
  it("含标题/作者/年份，缺省字段不输出对应行", () => {
    const ctx = paperContext(mk({ title: "Foo", publishedAt: "2021-03-01" }), 0);
    expect(ctx).toContain("论文 1：Foo");
    expect(ctx).toContain("Jane Doe");
    expect(ctx).toContain("2021");
    expect(ctx).not.toContain("摘要");
  });

  it("有摘要/已有分析则带上", () => {
    const ctx = paperContext(
      mk({ abstract: "An abstract", methodology: "A method" }),
      1,
    );
    expect(ctx).toContain("论文 2");
    expect(ctx).toContain("摘要：An abstract");
    expect(ctx).toContain("方法分析：A method");
  });

  it(">3 作者折叠为「等 N 人」", () => {
    const ctx = paperContext(
      mk({ authors: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }] }),
      0,
    );
    expect(ctx).toContain("等 4 人");
  });
});

describe("buildComparePrompt", () => {
  const papers = [mk({ id: "1", title: "Paper One" }), mk({ id: "2", title: "Paper Two" })];

  it("含篇数、全部维度、两篇上下文", () => {
    const p = buildComparePrompt(papers);
    expect(p).toContain("2 篇论文");
    for (const dim of COMPARE_DIMENSIONS) expect(p).toContain(dim);
    expect(p).toContain("Paper One");
    expect(p).toContain("Paper Two");
  });

  it("要求 Markdown 表格 + 不编造", () => {
    const p = buildComparePrompt(papers);
    expect(p).toContain("Markdown 表格");
    expect(p).toContain("不要编造");
  });
});
