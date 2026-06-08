import { describe, it, expect } from "vitest";
import { bibKey, toBibTeX, toBibTeXMany, formatCitation } from "@/lib/export/citations";
import type { Paper } from "@/lib/db/types";

const base: Paper = {
  id: "p1",
  title: "Attention Is All You Need",
  authors: [{ name: "Ashish Vaswani" }, { name: "Noam Shazeer" }],
  sourceType: "ARXIV",
  arxivId: "1706.03762",
  sourceUrl: "https://arxiv.org/abs/1706.03762",
  publishedAt: "2017-06-12",
  tags: ["arxiv", "NeurIPS"],
  citations: 100000,
  createdAt: "2024-01-01T00:00:00Z",
};

const journal: Paper = {
  id: "p2",
  title: "Deep Residual Learning",
  authors: [{ name: "Kaiming He" }],
  sourceType: "DOI",
  publishedAt: "2016-01-01",
  tags: ["openalex", "CVPR"],
  citations: 50000,
  createdAt: "2024-01-01T00:00:00Z",
};

describe("bibKey", () => {
  it("首作者姓 + 年 + 标题首词，全小写", () => {
    expect(bibKey(base)).toBe("vaswani2017attention");
  });
  it("无作者退化为 anon", () => {
    expect(bibKey({ ...base, authors: [] })).toMatch(/^anon2017/);
  });
  it("无年份退化为 nd", () => {
    expect(bibKey({ ...base, publishedAt: undefined })).toBe("vaswani2017attention".replace("2017", "nd"));
  });
});

describe("toBibTeX", () => {
  it("arXiv 论文用 @misc + eprint", () => {
    const bib = toBibTeX(base);
    expect(bib).toContain("@misc{vaswani2017attention,");
    expect(bib).toContain("eprint = {1706.03762}");
    expect(bib).toContain("archivePrefix = {arXiv}");
    expect(bib).toContain("author = {Ashish Vaswani and Noam Shazeer}");
    expect(bib).toContain("year = {2017}");
  });

  it("非 arXiv 用 @article + journal（取 tags 里的会议名）", () => {
    const bib = toBibTeX(journal);
    expect(bib).toContain("@article{");
    expect(bib).toContain("journal = {CVPR}");
    expect(bib).not.toContain("openalex"); // 来源标记不当作 venue
  });

  it("转义花括号等特殊字符", () => {
    const bib = toBibTeX({ ...base, title: "A {weird} & messy title" });
    expect(bib).toContain("\\{weird\\}");
    expect(bib).toContain("\\&");
  });
});

describe("toBibTeXMany", () => {
  it("拼接多条并以换行结尾", () => {
    const out = toBibTeXMany([base, journal]);
    expect(out).toContain("@misc{");
    expect(out).toContain("@article{");
    expect(out.endsWith("\n")).toBe(true);
  });
});

describe("formatCitation", () => {
  it("APA：作者首字母缩写 + 年 + 标题", () => {
    const c = formatCitation(base, "apa");
    expect(c).toContain("Vaswani, A.");
    expect(c).toContain("(2017)");
    expect(c).toContain("Attention Is All You Need");
    expect(c).toContain("arXiv:1706.03762");
  });

  it("MLA：单作者带引号标题", () => {
    const c = formatCitation(journal, "mla");
    expect(c).toContain('"Deep Residual Learning."');
    expect(c).toContain("2016");
  });

  it("GB/T 7714：arXiv 用 [EB/OL]，期刊用 [J]", () => {
    expect(formatCitation(base, "gbt7714")).toContain("[EB/OL]");
    expect(formatCitation(journal, "gbt7714")).toContain("[J]");
  });

  it("无年份显示 n.d.", () => {
    expect(formatCitation({ ...base, publishedAt: undefined }, "apa")).toContain("(n.d.)");
  });
});
