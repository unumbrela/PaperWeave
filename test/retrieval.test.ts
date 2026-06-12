import { describe, it, expect } from "vitest";
import {
  buildDoc,
  textHash,
  cosineSim,
  topK,
  tokenize,
  keywordTopK,
} from "@/lib/library-qa/retrieval";
import type { Paper } from "@/lib/db/types";

const paper = (over: Partial<Paper>): Paper => ({
  id: "p",
  title: "T",
  authors: [{ name: "Jane Doe" }],
  sourceType: "LOCAL",
  tags: [],
  citations: 0,
  createdAt: "2024-01-01",
  ...over,
});

describe("buildDoc", () => {
  it("包含标题与存在的字段，缺省字段跳过", () => {
    const d = buildDoc(paper({ title: "Foo", abstract: "abs", summary: "sum" }));
    expect(d).toContain("Foo");
    expect(d).toContain("摘要：abs");
    expect(d).toContain("概述：sum");
    expect(d).not.toContain("方法：");
  });

  it("有界长度（不超过 1600 字）", () => {
    const d = buildDoc(paper({ abstract: "x".repeat(5000) }));
    expect(d.length).toBeLessThanOrEqual(1600);
  });
});

describe("textHash", () => {
  it("同输入同哈希、异输入异哈希", () => {
    expect(textHash("hello world")).toBe(textHash("hello world"));
    expect(textHash("a")).not.toBe(textHash("b"));
  });
  it("空串安全", () => {
    expect(typeof textHash("")).toBe("string");
  });
});

describe("cosineSim", () => {
  it("同向量为 1", () => {
    expect(cosineSim([1, 0, 1], [1, 0, 1])).toBeCloseTo(1);
  });
  it("正交为 0", () => {
    expect(cosineSim([1, 0], [0, 1])).toBeCloseTo(0);
  });
  it("反向为 -1", () => {
    expect(cosineSim([1, 1], [-1, -1])).toBeCloseTo(-1);
  });
  it("维度不一致 / 零向量返回 0", () => {
    expect(cosineSim([1, 2, 3], [1, 2])).toBe(0);
    expect(cosineSim([0, 0], [1, 1])).toBe(0);
  });
});

describe("topK", () => {
  const items = [
    { id: "a", vector: [1, 0] },
    { id: "b", vector: [0.9, 0.1] },
    { id: "c", vector: [0, 1] },
  ];

  it("按相似度降序取前 k", () => {
    const r = topK([1, 0], items, 2);
    expect(r).toHaveLength(2);
    expect(r[0].item.id).toBe("a");
    expect(r[1].item.id).toBe("b");
    expect(r[0].score).toBeGreaterThanOrEqual(r[1].score);
  });

  it("k 大于元素数返回全部", () => {
    expect(topK([1, 0], items, 10)).toHaveLength(3);
  });

  it("k=0 返回空", () => {
    expect(topK([1, 0], items, 0)).toHaveLength(0);
  });
});

describe("tokenize（关键词降级的词元化）", () => {
  it("拉丁词小写化、过滤单字符，保留连字符复合词", () => {
    expect(tokenize("Mamba U-Net a I")).toEqual(["mamba", "u-net"]);
  });

  it("中文切二元组，单字 run 保留单字", () => {
    expect(tokenize("对比学习")).toEqual(["对比", "比学", "学习"]);
    expect(tokenize("好")).toEqual(["好"]);
  });

  it("中英混排两类词元都有", () => {
    const t = tokenize("用 diffusion 做图像分割");
    expect(t).toContain("diffusion");
    expect(t).toContain("图像");
    expect(t).toContain("分割");
  });
});

describe("keywordTopK（BM25 降级检索）", () => {
  const docs = [
    { item: "seg", text: "Medical image segmentation with U-Net 医学图像分割" },
    { item: "llm", text: "Large language model alignment via RLHF 大语言模型对齐" },
    { item: "cl", text: "Contrastive learning for vision 对比学习 表征" },
  ];

  it("英文查询命中正确文档且分数归一化到 1", () => {
    const r = keywordTopK("image segmentation", docs, 2);
    expect(r[0].item).toBe("seg");
    expect(r[0].score).toBe(1);
  });

  it("中文查询经二元组命中", () => {
    const r = keywordTopK("哪些论文用了对比学习？", docs, 3);
    expect(r[0].item).toBe("cl");
  });

  it("无重叠词元返回空，不硬凑结果", () => {
    expect(keywordTopK("quantum computing 量子", docs, 3)).toHaveLength(0);
  });

  it("空查询 / 空文档返回空", () => {
    expect(keywordTopK("", docs, 3)).toHaveLength(0);
    expect(keywordTopK("segmentation", [], 3)).toHaveLength(0);
  });
});
