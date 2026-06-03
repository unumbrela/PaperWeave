/**
 * 共享领域类型 —— 论文工作流的「单一类型事实源」
 *
 * 本地 Dexie(IndexedDB) 与可选云端 Prisma 都对齐这里的字段。
 * UI / hooks / 仓储层一律从这里取类型，不再直接依赖 `@prisma/client`，
 * 从而让前端在「不配数据库」时也能完整编译与运行。
 *
 * 注意：所有时间字段统一为 ISO **字符串**（与浏览器本地存储、JSON 传输的运行时
 * 实际形态一致；Prisma 的 Date 经 JSON 序列化后本就是字符串）。
 */

export type SourceType = 'ARXIV' | 'LOCAL' | 'DOI';

/** 标注类型 —— 科研语义四分类（与 prisma/schema.prisma 的 AnnotationType 枚举一致） */
export type AnnotationType = 'highlight' | 'insight' | 'todo' | 'transferable';

export interface Author {
  name: string;
  affiliation?: string;
}

/** PDF 选区矩形（页面坐标系，归一化或像素由调用方约定） */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 论文条目 —— 论文库的核心实体 */
export interface Paper {
  id: string;
  arxivId?: string;
  title: string;
  abstract?: string;
  authors: Author[];
  sourceType: SourceType;
  sourceUrl?: string;
  pdfPath?: string;
  publishedAt?: string;
  tags: string[];
  direction?: string;
  notes?: string;
  summary?: string;
  methodology?: string;
  contribution?: string;
  citations: number;
  createdAt: string;
  updatedAt?: string;
}

/** PDF 标注 */
export interface Annotation {
  id: string;
  paperId: string;
  page: number;
  rects: Rect[];
  selectedText: string;
  type: AnnotationType;
  color: string;
  comment?: string;
  aiSummary?: unknown;
  createdAt: string;
  updatedAt?: string;
}

/** 研究笔记（每篇论文一条，富文本/Markdown 内容） */
export interface ResearchNote {
  id: string;
  paperId: string;
  title?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/** 标注类型 → 高亮颜色（科研四分类配色） */
export const ANNOTATION_COLORS: Record<AnnotationType, string> = {
  highlight: '#F6E7B2',
  insight: '#CFE3FF',
  todo: '#DCCBFF',
  transferable: '#CBEFD8',
};
