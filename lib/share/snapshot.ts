/**
 * 只读分享快照 —— 把本地论文 / 论文库**冻结**成一份服务端可托管的 JSON 快照。
 *
 * 设计为「快照」而非「实时镜像」：分享与「云同步 / 登录」解耦——只要服务端配了
 * Supabase service-role，任何人（含纯本地用户）都能生成一个公开只读链接，
 * 链接内容是点击那一刻的副本，不随本地后续编辑变化。纯函数，可单测。
 */

import type { Paper, Annotation, ResearchNote, StickyNote, AnnotationType } from "@/lib/db/types";

export type ShareKind = "paper" | "library";

/** 单篇论文快照里保留的字段（去掉本地 id 等无意义对外的字段）。 */
export interface PaperSnapshot {
  title: string;
  authors: string[];
  abstract?: string;
  summary?: string;
  methodology?: string;
  contribution?: string;
  notes?: string;
  tags: string[];
  year?: number;
  citations?: number;
  sourceUrl?: string;
  arxivId?: string;
}

export interface AnnotationSnapshot {
  page: number;
  type: AnnotationType;
  selectedText: string;
  comment?: string;
}

export interface StickyNoteSnapshot {
  page: number;
  content: string;
}

export interface PaperShareData extends PaperSnapshot {
  annotations: AnnotationSnapshot[];
  researchNote?: string;
  /** 页面便签（📒，仅保留页码与内容，坐标对只读分享无意义） */
  stickyNotes?: StickyNoteSnapshot[];
}

export interface LibraryShareData {
  count: number;
  papers: PaperSnapshot[];
}

export interface ShareSnapshot {
  kind: ShareKind;
  title: string;
  createdAt: string;
  data: PaperShareData | LibraryShareData;
}

const TOKEN_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** 生成 URL 安全的随机分享 token（默认 12 位，base36）。 */
export function genShareToken(length = 12): string {
  let out = "";
  // 优先用 crypto（浏览器 / Node 都有 globalThis.crypto），退化到 Math.random
  const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoObj?.getRandomValues) {
    const buf = new Uint32Array(length);
    cryptoObj.getRandomValues(buf);
    for (let i = 0; i < length; i++) out += TOKEN_ALPHABET[buf[i] % TOKEN_ALPHABET.length];
  } else {
    for (let i = 0; i < length; i++)
      out += TOKEN_ALPHABET[Math.floor(Math.random() * TOKEN_ALPHABET.length)];
  }
  return out;
}

function paperYear(paper: Paper): number | undefined {
  if (!paper.publishedAt) return undefined;
  const m = paper.publishedAt.match(/\d{4}/);
  return m ? Number(m[0]) : undefined;
}

/** Paper → 对外快照（裁剪本地字段）。 */
export function toPaperSnapshot(paper: Paper): PaperSnapshot {
  return {
    title: paper.title,
    authors: (paper.authors || []).map((a) => a.name),
    abstract: paper.abstract,
    summary: paper.summary,
    methodology: paper.methodology,
    contribution: paper.contribution,
    notes: paper.notes,
    tags: paper.tags || [],
    year: paperYear(paper),
    citations: paper.citations,
    sourceUrl: paper.sourceUrl,
    arxivId: paper.arxivId,
  };
}

/** 构造单篇分享快照（含批注分类、研究笔记与页面便签）。 */
export function buildPaperSnapshot(
  paper: Paper,
  annotations: Annotation[],
  note?: ResearchNote,
  stickyNotes?: StickyNote[],
): ShareSnapshot {
  const stickies = (stickyNotes || [])
    .filter((n) => n.content.trim())
    .sort((a, b) => a.page - b.page || a.y - b.y)
    .map((n) => ({ page: n.page, content: n.content }));
  const data: PaperShareData = {
    ...toPaperSnapshot(paper),
    annotations: (annotations || []).map((a) => ({
      page: a.page,
      type: a.type,
      selectedText: a.selectedText,
      comment: a.comment,
    })),
    researchNote: note?.content || paper.notes,
    ...(stickies.length > 0 ? { stickyNotes: stickies } : {}),
  };
  return {
    kind: "paper",
    title: paper.title,
    createdAt: new Date().toISOString(),
    data,
  };
}

/** 构造整库分享快照（仅元数据 + 已有分析，不含批注）。 */
export function buildLibrarySnapshot(papers: Paper[], title = "我的论文库"): ShareSnapshot {
  const data: LibraryShareData = {
    count: papers.length,
    papers: papers.map(toPaperSnapshot),
  };
  return {
    kind: "library",
    title: `${title}（${papers.length} 篇）`,
    createdAt: new Date().toISOString(),
    data,
  };
}

/** 由 token 拼出可分享的绝对 URL（origin 由调用方传入）。 */
export function shareUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/share/${token}`;
}
