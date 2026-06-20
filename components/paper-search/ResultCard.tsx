"use client";

import { useState } from "react";
import {
  ExternalLink, Loader2, Sparkles, ChevronRight, FileText, Copy, Check,
  Plus, Network, BookOpen, Download,
} from "lucide-react";
import type { PaperResult } from "@/lib/paper-search/types";
import { formatCitations } from "@/lib/paper-search/refine";
import { cn } from "@/lib/utils";

const SOURCE_META: Record<string, { label: string; dot: string }> = {
  arxiv: { label: "arXiv", dot: "var(--coral)" },
  openalex: { label: "OpenAlex", dot: "var(--ocean)" },
  "semantic-scholar": { label: "S2", dot: "var(--sage)" },
};

/** 摘要超过该长度才显示「展开」 */
const ABSTRACT_CLAMP = 280;

/**
 * 检索结果目录行 —— 编辑部式排版：mono 元数据行前置、标题主导、
 * 摘要可展开、动作收为底部一行小按钮。本组件不带外框，由父级
 * 列表用 hairline 分隔。
 */
export function ResultCard({
  paper,
  index,
  selected,
  importing,
  imported,
  analyzing,
  copied,
  analysis,
  quickSummary,
  position,
  expanded,
  onToggleSelect,
  onCopyLink,
  onAnalyze,
  onSummarize,
  onImport,
  onRead,
  onToggleExpand,
}: {
  paper: PaperResult;
  /** 在结果列表中的序号（0-based，显示时 +1） */
  index: number;
  selected: boolean;
  importing: boolean;
  imported: boolean;
  analyzing: boolean;
  copied: boolean;
  analysis?: string;
  /** LLM 一句话总结（「一键速览」批量生成） */
  quickSummary?: string;
  /** LLM 方向定位（「一键速览」批量生成）：这篇在所属方向里的位置 */
  position?: string;
  expanded: boolean;
  onToggleSelect: () => void;
  onCopyLink: (key: string, url: string) => void;
  onAnalyze: () => void;
  onSummarize: () => void;
  onImport: () => void;
  /** 一键阅读：自动入库后直达 PDF 阅读器 */
  onRead?: () => void;
  onToggleExpand: () => void;
}) {
  const [abstractOpen, setAbstractOpen] = useState(false);
  const source = SOURCE_META[paper.source] ?? { label: paper.source, dot: "var(--ink-4)" };
  const longAbstract = (paper.abstract?.length ?? 0) > ABSTRACT_CLAMP;

  const actionBtn = cn(
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-50",
  );

  return (
    <article
      className={cn(
        "group relative px-4 py-5 transition-colors sm:px-6",
        selected ? "bg-plum/[0.045]" : "hover:bg-[rgba(26,23,19,0.018)]",
      )}
    >
      {/* 选中态左缘标记 */}
      {selected && <span className="absolute inset-y-3 left-0 w-[3px] rounded-full bg-plum/50" />}

      <div className="flex gap-3 sm:gap-4">
        {/* 序号 + 选择 */}
        <div className="flex w-8 shrink-0 flex-col items-center gap-2 pt-1">
          <button
            onClick={onToggleSelect}
            title={selected ? "取消选择" : "选择论文"}
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-md border transition-all",
              selected
                ? "border-plum bg-plum text-paper-2"
                : "border-line-strong text-transparent hover:border-plum/60",
            )}
          >
            <Check className="h-3 w-3" strokeWidth={3} />
          </button>
          <span className="mono text-[12px] tabular-nums text-ink-4">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          {/* mono 元数据行 */}
          <div className="mono flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: source.dot }} />
              {source.label}
            </span>
            {paper.year && <span className="tabular-nums">{paper.year}</span>}
            {paper.venue && (
              <span className="max-w-[260px] truncate rounded-full bg-ocean/8 px-2 py-px text-ocean">
                {paper.venue}
              </span>
            )}
            {paper.citations != null && (
              <span className="tabular-nums" title={`${paper.citations.toLocaleString()} 次被引`}>
                被引 {formatCitations(paper.citations)}
              </span>
            )}
            {paper.pdfUrl && <span className="text-sage">PDF</span>}
          </div>

          {/* 标题 */}
          <h3 className="mt-1.5 text-[15.5px] font-medium leading-snug text-ink">
            <a
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="decoration-plum/40 underline-offset-[3px] transition-colors hover:text-plum hover:underline"
            >
              {paper.title}
            </a>
          </h3>

          {/* 作者 */}
          {paper.authors.length > 0 && (
            <p className="mt-1 truncate text-[12.5px] text-ink-3">
              {paper.authors.slice(0, 6).join(" · ")}
              {paper.authors.length > 6 && ` 等 ${paper.authors.length} 人`}
            </p>
          )}

          {/* 一句话速览 + 方向定位 */}
          {quickSummary && (
            <div className="mt-2 rounded-lg border border-sun/30 bg-sun/12 px-2.5 py-1.5">
              <p className="text-[12.5px] leading-relaxed text-ink">
                <Sparkles className="mr-1 inline h-3 w-3 align-[-2px] text-ink-2" />
                {quickSummary}
              </p>
              {position && (
                <p className="mt-1 flex items-baseline gap-1.5 text-[11.5px] leading-relaxed text-ink-3">
                  <span className="overline shrink-0 text-[9px] text-plum">定位</span>
                  <span>{position}</span>
                </p>
              )}
            </div>
          )}

          {/* 摘要（可展开） */}
          {paper.abstract && (
            <p className={cn("mt-2 text-[12.5px] leading-relaxed text-ink-2", !abstractOpen && "line-clamp-2")}>
              {paper.abstract}
              {abstractOpen && longAbstract && (
                <button
                  onClick={() => setAbstractOpen(false)}
                  className="ml-2 text-[12px] text-plum hover:underline"
                >
                  收起
                </button>
              )}
            </p>
          )}
          {paper.abstract && longAbstract && !abstractOpen && (
            <button
              onClick={() => setAbstractOpen(true)}
              className="mt-0.5 text-[12px] text-ink-4 transition-colors hover:text-plum"
            >
              展开摘要 ↓
            </button>
          )}

          {/* AI 结构化分析 */}
          {analysis && (
            <div className="mt-3">
              <button
                onClick={onToggleExpand}
                className="flex items-center gap-1.5 text-[12.5px] text-ink-2 transition-colors hover:text-ink"
              >
                <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")} />
                <span className="serif-italic">AI 分析结果</span>
              </button>
              {expanded && (
                <div className="mt-2 whitespace-pre-line rounded-xl border border-plum/15 bg-plum/[0.04] p-3.5 text-[12.5px] leading-relaxed text-ink-2">
                  {analysis}
                </div>
              )}
            </div>
          )}

          {/* 动作行 */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {paper.pdfUrl && onRead && (
              <button
                onClick={onRead}
                disabled={importing}
                className={cn(actionBtn, "bg-coral/10 font-medium text-[#a53425] hover:bg-coral/18")}
                title="自动入库并打开 PDF 阅读器"
              >
                {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <BookOpen className="h-3 w-3" />}
                阅读
              </button>
            )}
            <button
              onClick={onImport}
              disabled={importing || imported}
              className={cn(
                actionBtn,
                imported ? "text-sage" : "text-plum hover:bg-plum/10",
              )}
            >
              {importing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : imported ? (
                <Check className="h-3 w-3" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              {imported ? "已入库" : "导入库"}
            </button>
            <button
              onClick={onAnalyze}
              disabled={analyzing}
              className={cn(actionBtn, "text-ink-3 hover:bg-paper-3 hover:text-ink")}
            >
              {analyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              AI 分析
            </button>
            <button
              onClick={onSummarize}
              className={cn(actionBtn, "text-ink-3 hover:bg-paper-3 hover:text-ink")}
              title="在速读器中打开"
            >
              <FileText className="h-3 w-3" />
              速读
            </button>
            {paper.source === "openalex" && (
              <a
                href={`/tools/citation-graph?id=${encodeURIComponent(paper.id)}&title=${encodeURIComponent(paper.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(actionBtn, "text-ink-3 hover:bg-paper-3 hover:text-ink")}
                title="查看引文网络图谱"
              >
                <Network className="h-3 w-3" />
                引用网络
              </a>
            )}
            {paper.pdfUrl && (
              <a
                href={paper.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(actionBtn, "text-ink-3 hover:bg-paper-3 hover:text-ink")}
                title="下载 PDF"
              >
                <Download className="h-3 w-3" />
                PDF
              </a>
            )}
            <button
              onClick={() => onCopyLink(paper.id, paper.url)}
              className={cn(actionBtn, copied ? "text-sage" : "text-ink-3 hover:bg-paper-3 hover:text-ink")}
              title={paper.url}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "已复制" : "链接"}
            </button>
            <a
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto hidden rounded-full p-1.5 text-ink-4 transition-colors hover:text-ink sm:inline-flex"
              title="打开原文页面"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
