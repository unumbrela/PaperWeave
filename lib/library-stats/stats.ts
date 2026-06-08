/**
 * 论文库统计 —— 把本地论文 + 批注聚合成看板所需的各项分布（纯函数，可单测）。
 * 全部基于 Dexie 本地数据，无网络、无 AI，零配置可用。
 */

import type { Paper, Annotation, AnnotationType } from "@/lib/db/types";

export interface Bucket {
  label: string;
  count: number;
}

export interface TagBucket {
  tag: string;
  count: number;
}

export interface CitedItem {
  title: string;
  citations: number;
}

export interface LibraryStats {
  total: number;
  totalCitations: number;
  totalAnnotations: number;
  totalNotes: number;
  bySource: Bucket[];
  byYear: Bucket[];
  byMonth: Bucket[];
  byAnnotationType: { type: AnnotationType; count: number }[];
  topTags: TagBucket[];
  topCited: CitedItem[];
}

const SOURCE_LABELS: Record<string, string> = { ARXIV: "arXiv", LOCAL: "本地", DOI: "DOI" };
const ANNOTATION_ORDER: AnnotationType[] = ["highlight", "insight", "todo", "transferable"];
const SOURCE_TAGS = new Set(["arxiv", "openalex", "semantic-scholar"]);

function yearOf(paper: Paper): string | null {
  if (!paper.publishedAt) return null;
  const m = paper.publishedAt.match(/\d{4}/);
  return m ? m[0] : null;
}

function monthOf(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function tally<T>(items: T[], key: (t: T) => string | null): Map<string, number> {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    if (k == null) continue;
    map.set(k, (map.get(k) || 0) + 1);
  }
  return map;
}

/** 计算论文库统计。topTagsLimit / topMonths 可调，默认 10 个标签、最近 12 个月。 */
export function computeStats(
  papers: Paper[],
  annotations: Annotation[],
  opts: { topTagsLimit?: number; topMonths?: number } = {},
): LibraryStats {
  const { topTagsLimit = 10, topMonths = 12 } = opts;

  const bySource: Bucket[] = [...tally(papers, (p) => p.sourceType).entries()]
    .map(([label, count]) => ({ label: SOURCE_LABELS[label] || label, count }))
    .sort((a, b) => b.count - a.count);

  const byYear: Bucket[] = [...tally(papers, yearOf).entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const byMonth: Bucket[] = [...tally(papers, (p) => monthOf(p.createdAt)).entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(-topMonths);

  const tagCounts = new Map<string, number>();
  for (const p of papers) {
    for (const tag of p.tags || []) {
      if (!tag || SOURCE_TAGS.has(tag.toLowerCase())) continue; // 来源标记不计入主题标签
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  const topTags: TagBucket[] = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, topTagsLimit);

  const annoCounts = tally(annotations, (a) => a.type);
  const byAnnotationType = ANNOTATION_ORDER.map((type) => ({
    type,
    count: annoCounts.get(type) || 0,
  }));

  const topCited: CitedItem[] = [...papers]
    .filter((p) => (p.citations || 0) > 0)
    .sort((a, b) => (b.citations || 0) - (a.citations || 0))
    .slice(0, 5)
    .map((p) => ({ title: p.title, citations: p.citations || 0 }));

  const totalNotes = papers.filter((p) => p.notes && p.notes.trim()).length;

  return {
    total: papers.length,
    totalCitations: papers.reduce((s, p) => s + (p.citations || 0), 0),
    totalAnnotations: annotations.length,
    totalNotes,
    bySource,
    byYear,
    byMonth,
    byAnnotationType,
    topTags,
    topCited,
  };
}
