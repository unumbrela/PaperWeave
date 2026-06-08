/**
 * 多篇论文对比 —— 构造发给 LLM 的 prompt（纯函数，可单测）。
 *
 * 把选中的论文逐篇序列化成「标题 / 作者 / 年份 / 摘要 / 已有结构化分析」，
 * 要求模型产出一张 Markdown 对比表（固定维度）+ 一段简短综述。
 */

import type { Paper, Author } from "@/lib/db/types";

/** 对比维度（行），固定顺序便于横向阅读。 */
export const COMPARE_DIMENSIONS = [
  "研究问题",
  "核心方法",
  "数据集",
  "评价指标",
  "主要创新",
  "局限/开放问题",
] as const;

function authorsShort(authors: Author[]): string {
  const names = (authors || []).map((a) => a.name);
  if (names.length === 0) return "未知作者";
  return names.length <= 3 ? names.join(", ") : `${names[0]} 等 ${names.length} 人`;
}

function paperYear(paper: Paper): string {
  if (!paper.publishedAt) return "n.d.";
  const m = paper.publishedAt.match(/\d{4}/);
  return m ? m[0] : "n.d.";
}

/** 单篇论文 → 供模型阅读的上下文块。 */
export function paperContext(paper: Paper, index: number): string {
  const lines = [
    `### 论文 ${index + 1}：${paper.title}`,
    `- 作者：${authorsShort(paper.authors)}`,
    `- 年份：${paperYear(paper)}`,
  ];
  if (paper.abstract) lines.push(`- 摘要：${paper.abstract}`);
  if (paper.summary) lines.push(`- 已有概述：${paper.summary}`);
  if (paper.methodology) lines.push(`- 已有方法分析：${paper.methodology}`);
  if (paper.contribution) lines.push(`- 已有创新点：${paper.contribution}`);
  return lines.join("\n");
}

/** 构造完整对比 prompt。papers 应已去重、长度 ≥ 2。 */
export function buildComparePrompt(papers: Paper[]): string {
  const header = papers.map((p, i) => `论文 ${i + 1}`).join(" / ");
  const contexts = papers.map((p, i) => paperContext(p, i)).join("\n\n");
  const dims = COMPARE_DIMENSIONS.map((d) => `「${d}」`).join("、");

  return `你是一位严谨的学术综述助手。请对下面 ${papers.length} 篇论文做横向对比。

要求：
1. 先输出一张 **Markdown 表格**：第一列是对比维度，其余每列对应一篇论文（列头用论文 ${header} 的简短标题，不要写全名）。
2. 表格的行（维度）固定且按此顺序：${dims}。
3. 每个单元格简明扼要（一句话/几个词），基于给定信息，**不要编造**；信息缺失写「未提及」。
4. 表格之后，用 2-4 句话给出一段「综合对比」，点出它们的关系（互补 / 竞争 / 演进）与选型建议。
5. 全程使用中文，只输出表格与综述，不要任何额外解释或代码块包裹。

待对比论文：

${contexts}`;
}
