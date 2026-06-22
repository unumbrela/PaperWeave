import { describe, it, expect } from "vitest";
import { parseIdeaSet, pickRecommended } from "@/lib/idea/parse";
import type { Idea } from "@/lib/idea/types";

// 创新点工坊 · 设计阶段输出解析：容忍围栏 / 前后散文 / 损坏 JSON。

const fullIdea = {
  title: "标题",
  motivation: "动机",
  hypothesis: "假设",
  experiment: "实验",
  resources: "资源",
  risk: "风险",
  novelty: 4,
  feasibility: 5,
  lens: "机制替换",
};

describe("parseIdeaSet", () => {
  it("解析带 ```json 围栏 + 前置散文的标准输出", () => {
    const text = `我的思路是……\n\n\`\`\`json\n${JSON.stringify({ ideas: [fullIdea], priority: "先做 1" })}\n\`\`\``;
    const set = parseIdeaSet(text);
    expect(set.ideas).toHaveLength(1);
    expect(set.ideas[0].id).toBe("idea-1");
    expect(set.ideas[0].title).toBe("标题");
    expect(set.ideas[0].lens).toBe("机制替换");
    expect(set.priority).toBe("先做 1");
    expect(set.raw).toBeUndefined();
  });

  it("解析无围栏的裸 JSON 对象", () => {
    const text = `{"ideas":[${JSON.stringify(fullIdea)}],"priority":"x"}`;
    const set = parseIdeaSet(text);
    expect(set.ideas).toHaveLength(1);
    expect(set.priority).toBe("x");
  });

  it("接受顶层直接是数组的形态", () => {
    const text = JSON.stringify([fullIdea, { ...fullIdea, title: "二号" }]);
    const set = parseIdeaSet(text);
    expect(set.ideas).toHaveLength(2);
    expect(set.ideas[1].id).toBe("idea-2");
  });

  it("评分越界被钳制到 1–5，缺失评分取默认 3", () => {
    const text = JSON.stringify({ ideas: [{ title: "t", novelty: 9, feasibility: 0 }, { title: "t2" }] });
    const set = parseIdeaSet(text);
    expect(set.ideas[0].novelty).toBe(5);
    expect(set.ideas[0].feasibility).toBe(1);
    expect(set.ideas[1].novelty).toBe(3);
    expect(set.ideas[1].feasibility).toBe(3);
  });

  it("丢弃没有 title 的条目", () => {
    const text = JSON.stringify({ ideas: [{ motivation: "无标题" }, fullIdea] });
    const set = parseIdeaSet(text);
    expect(set.ideas).toHaveLength(1);
    expect(set.ideas[0].title).toBe("标题");
  });

  it("损坏 JSON → 回退 raw，不抛错", () => {
    const text = "这是一段没有任何 JSON 的纯文字输出";
    const set = parseIdeaSet(text);
    expect(set.ideas).toHaveLength(0);
    expect(set.raw).toBe(text);
  });

  it("围栏内 JSON 截断 → 回退 raw", () => {
    const text = "```json\n{\"ideas\":[{\"title\":\"被截断\",\n```";
    const set = parseIdeaSet(text);
    expect(set.ideas).toHaveLength(0);
    expect(set.raw).toBe(text);
  });
});

describe("pickRecommended", () => {
  const mk = (id: string, n: number, f: number): Idea => ({
    id,
    title: id,
    motivation: "",
    hypothesis: "",
    experiment: "",
    resources: "",
    risk: "",
    novelty: n,
    feasibility: f,
  });

  it("综合分最高者胜出", () => {
    expect(pickRecommended([mk("a", 3, 3), mk("b", 5, 4), mk("c", 4, 4)])?.id).toBe("b");
  });

  it("综合分并列时取可行性更高者", () => {
    expect(pickRecommended([mk("a", 5, 3), mk("b", 3, 5)])?.id).toBe("b");
  });

  it("空数组返回 null", () => {
    expect(pickRecommended([])).toBeNull();
  });
});
