"use client";

import {
  ExternalLink, Download, Loader2, Sparkles, ChevronRight,
  CheckSquare, Square, FileText, Copy, Check, Plus, Network,
} from "lucide-react";
import type { PaperResult } from "@/lib/paper-search/types";
import { cn } from "@/lib/utils";

const SOURCE_LABEL: Record<string, string> = {
  arxiv: "arXiv",
  openalex: "OpenAlex",
  "semantic-scholar": "Semantic Scholar",
};

/** 单条检索结果卡片（含选择 / 复制链接 / AI 分析 / 速读 / 入库）。 */
export function ResultCard({
  paper,
  selected,
  importing,
  imported,
  analyzing,
  copied,
  pdfCopied,
  analysis,
  expanded,
  onToggleSelect,
  onCopyLink,
  onAnalyze,
  onSummarize,
  onImport,
  onToggleExpand,
}: {
  paper: PaperResult;
  selected: boolean;
  importing: boolean;
  imported: boolean;
  analyzing: boolean;
  copied: boolean;
  pdfCopied: boolean;
  analysis?: string;
  expanded: boolean;
  onToggleSelect: () => void;
  onCopyLink: (key: string, url: string) => void;
  onAnalyze: () => void;
  onSummarize: () => void;
  onImport: () => void;
  onToggleExpand: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-paper-2/60 p-4 transition-colors",
        selected
          ? "border-plum/60 shadow-[0_0_0_1px_rgba(177,75,255,0.12)]"
          : "border-line hover:border-line-strong",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onToggleSelect}
          className="mt-1 rounded-lg p-1 text-ink-3 hover:text-plum hover:bg-plum/10 transition-colors"
          title="选择论文"
        >
          {selected ? <CheckSquare className="w-4 h-4 text-plum" /> : <Square className="w-4 h-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-paper-2/80 text-ink-3">
              {SOURCE_LABEL[paper.source] ?? paper.source}
            </span>
            {paper.year && <span className="text-xs text-ink-3">{paper.year}</span>}
            {paper.venue && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-ocean/10 text-ocean">
                {paper.venue}
              </span>
            )}
            {paper.citations != null && (
              <span className="text-xs text-ink-3">引用: {paper.citations}</span>
            )}
          </div>

          <h3 className="text-[15px] font-medium text-ink line-clamp-2 mb-2">
            <a
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-plum transition-colors"
            >
              {paper.title}
              <ExternalLink className="w-3 h-3" />
            </a>
          </h3>

          <div className="mb-2">
            <div className="flex items-center gap-1 bg-paper-2/80 rounded-lg px-2 py-1 border border-line">
              <span className="text-[10px] text-ink-4 truncate flex-1">{paper.url}</span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCopyLink(paper.id, paper.url);
                }}
                className="flex-shrink-0 p-1 hover:bg-paper-2 rounded-md transition-colors"
                title="复制链接"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-sage" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-ink-4 hover:text-ink-2" />
                )}
              </button>
            </div>
            {paper.pdfUrl && (
              <div className="mt-2 flex items-center gap-1 bg-ocean/10 rounded-lg px-2 py-1 border border-ocean/20">
                <span className="text-[10px] text-ocean truncate flex-1">{paper.pdfUrl}</span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (paper.pdfUrl) onCopyLink(paper.id + "-pdf", paper.pdfUrl);
                  }}
                  className="flex-shrink-0 p-1 hover:bg-ocean/12 rounded-md transition-colors"
                  title="复制PDF链接"
                >
                  {pdfCopied ? (
                    <Check className="w-3.5 h-3.5 text-sage" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-ocean" />
                  )}
                </button>
              </div>
            )}
          </div>

          <p className="text-xs text-ink-3 truncate mt-1">{paper.authors.join(", ")}</p>

          {paper.abstract && (
            <p className="text-xs text-ink-2 line-clamp-3 mt-2 leading-relaxed">{paper.abstract}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          {paper.pdfUrl && (
            <a
              href={paper.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-paper-2/80 text-[12px] text-ink-2 hover:bg-paper-2 hover:text-ink transition-colors"
            >
              <Download className="w-3 h-3" />
              PDF
            </a>
          )}

          <button
            onClick={onAnalyze}
            disabled={analyzing}
            className={cn(
              "inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[12px] transition-colors",
              analyzing
                ? "bg-paper-2/80 text-ink-3 cursor-not-allowed"
                : "bg-sun/20 text-ink-2 hover:bg-sun/30",
            )}
          >
            {analyzing ? (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                分析中
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI分析
              </span>
            )}
          </button>

          <button
            onClick={onSummarize}
            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-ocean/10 text-ocean hover:bg-ocean/20 text-[12px] transition-colors"
          >
            <FileText className="w-3 h-3" />
            速读
          </button>

          {paper.source === "openalex" && (
            <a
              href={`/tools/citation-graph?id=${encodeURIComponent(paper.id)}&title=${encodeURIComponent(paper.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-plum/8 text-plum hover:bg-plum/16 text-[12px] transition-colors"
              title="查看引用网络"
            >
              <Network className="w-3 h-3" />
              引用网络
            </a>
          )}

          <button
            onClick={onImport}
            disabled={importing || imported}
            className={cn(
              "inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[12px] transition-colors",
              importing
                ? "bg-paper-2/80 text-ink-3 cursor-not-allowed"
                : imported
                  ? "bg-sage/10 text-sage cursor-default"
                  : "bg-plum/10 text-plum hover:bg-plum/20",
            )}
          >
            {importing ? (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                导入中
              </span>
            ) : imported ? (
              <span>已入库</span>
            ) : (
              <span className="flex items-center gap-1">
                <Plus className="w-3 h-3" />
                导入库
              </span>
            )}
          </button>
        </div>
      </div>

      {analysis && (
        <div className="mt-4 pt-4 border-t border-line">
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-2 text-sm text-ink-2 hover:text-ink mb-3 transition-colors"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
            <span className="serif-italic">AI 分析结果</span>
          </button>
          {expanded && (
            <div className="bg-paper-2/40 rounded-xl p-4 text-sm text-ink-2 whitespace-pre-line">
              {analysis}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
