import { describe, it, expect } from "vitest";
import {
  genShareToken,
  toPaperSnapshot,
  buildPaperSnapshot,
  buildLibrarySnapshot,
  shareUrl,
  type PaperShareData,
  type LibraryShareData,
} from "@/lib/share/snapshot";
import type { Paper, Annotation, ResearchNote } from "@/lib/db/types";

const paper = (over: Partial<Paper> = {}): Paper => ({
  id: "p1",
  title: "Attention Is All You Need",
  authors: [{ name: "Ashish Vaswani" }, { name: "Noam Shazeer" }],
  sourceType: "ARXIV",
  arxivId: "1706.03762",
  sourceUrl: "https://arxiv.org/abs/1706.03762",
  publishedAt: "2017-06-12",
  tags: ["arxiv", "NeurIPS"],
  summary: "Transformer 架构",
  citations: 100000,
  createdAt: "2024-01-01",
  ...over,
});

describe("genShareToken", () => {
  it("默认 12 位、URL 安全字符", () => {
    const t = genShareToken();
    expect(t).toHaveLength(12);
    expect(t).toMatch(/^[a-z0-9]+$/);
  });
  it("可指定长度", () => {
    expect(genShareToken(20)).toHaveLength(20);
  });
  it("两次生成几乎不重复", () => {
    expect(genShareToken()).not.toBe(genShareToken());
  });
});

describe("toPaperSnapshot", () => {
  it("作者拍平为字符串数组、年份从 publishedAt 提取、剥离本地 id", () => {
    const s = toPaperSnapshot(paper());
    expect(s.authors).toEqual(["Ashish Vaswani", "Noam Shazeer"]);
    expect(s.year).toBe(2017);
    expect(s).not.toHaveProperty("id");
    expect(s.summary).toBe("Transformer 架构");
  });
  it("无 publishedAt 时 year 为 undefined", () => {
    expect(toPaperSnapshot(paper({ publishedAt: undefined })).year).toBeUndefined();
  });
});

describe("buildPaperSnapshot", () => {
  const annos: Annotation[] = [
    {
      id: "a1",
      paperId: "p1",
      page: 2,
      rects: [],
      selectedText: "key sentence",
      type: "insight",
      color: "#CFE3FF",
      comment: "重要",
      createdAt: "2024-01-02",
    },
  ];
  const note: ResearchNote = {
    id: "n1",
    paperId: "p1",
    content: "我的笔记",
    createdAt: "2024-01-02",
    updatedAt: "2024-01-02",
  };

  it("kind=paper，含批注（裁剪到对外字段）与研究笔记", () => {
    const snap = buildPaperSnapshot(paper(), annos, note);
    expect(snap.kind).toBe("paper");
    expect(snap.title).toBe("Attention Is All You Need");
    const data = snap.data as PaperShareData;
    expect(data.annotations).toHaveLength(1);
    expect(data.annotations[0]).toEqual({
      page: 2,
      type: "insight",
      selectedText: "key sentence",
      comment: "重要",
    });
    expect(data.researchNote).toBe("我的笔记");
  });

  it("无笔记时回退到 paper.notes", () => {
    const snap = buildPaperSnapshot(paper({ notes: "回退笔记" }), [], undefined);
    expect((snap.data as PaperShareData).researchNote).toBe("回退笔记");
  });
});

describe("buildLibrarySnapshot", () => {
  it("kind=library，含篇数与每篇快照，标题带计数", () => {
    const snap = buildLibrarySnapshot([paper({ id: "a" }), paper({ id: "b" })]);
    expect(snap.kind).toBe("library");
    expect(snap.title).toContain("2 篇");
    const data = snap.data as LibraryShareData;
    expect(data.count).toBe(2);
    expect(data.papers).toHaveLength(2);
  });
});

describe("shareUrl", () => {
  it("拼出 /share/<token>，去重尾斜杠", () => {
    expect(shareUrl("https://x.com", "abc")).toBe("https://x.com/share/abc");
    expect(shareUrl("https://x.com/", "abc")).toBe("https://x.com/share/abc");
  });
});
