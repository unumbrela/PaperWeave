"use client";

import Link from "next/link";
import {
  Calendar, ChevronDown, ChevronUp, Tag, Sparkles, ExternalLink, Trash2,
} from "lucide-react";
import type { Paper, Author } from "@/lib/db/types";
import { cn } from "@/lib/utils";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getSourceTypeLabel(type: string) {
  const labels: Record<string, string> = { ARXIV: "arXiv", LOCAL: "本地", DOI: "DOI" };
  return labels[type] || type;
}

function renderAuthors(authors: Author[]) {
  if (authors.length === 0) return "未知作者";
  if (authors.length <= 3) return authors.map((a) => a.name).join(", ");
  return `${authors[0].name} 等 ${authors.length} 人`;
}

// 引用热度色阶（编码引用量，非装饰）
function getCitationColor(citations?: number) {
  const count = citations || 0;
  if (count >= 80000) return "from-[#7f1d1d] to-[#dc2626]";
  if (count >= 60000) return "from-[#991b1b] to-[#ea580c]";
  if (count >= 40000) return "from-[#b91c1c] to-[#f97316]";
  if (count >= 20000) return "from-[#dc2626] to-[#fb923c]";
  if (count >= 10000) return "from-[#ef4444] to-[#fdba74]";
  return "from-[#fca5a5] to-[#fed7aa]";
}

function formatCitations(citations?: number) {
  const count = citations || 0;
  return count >= 10000 ? (count / 1000).toFixed(0) + "k" : count.toString();
}

const chip = "px-2 py-0.5 rounded-full text-xs bg-paper-3 text-ink-3";

/** 论文库列表卡片（含 AI 分析折叠区）。 */
export function PaperCard({
  paper,
  expanded,
  onToggleExpand,
  onDelete,
  onAnalyze,
}: {
  paper: Paper;
  expanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onAnalyze: () => void;
}) {
  return (
    <div className="surface rounded-2xl overflow-hidden relative transition-shadow hover:shadow-md">
      {/* 卡片头部 */}
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div
            className={cn(
              "flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center",
              "bg-gradient-to-br " + getCitationColor(paper.citations),
            )}
          >
            <div className="text-center">
              <div className="text-white font-bold text-sm">{formatCitations(paper.citations)}</div>
              <div className="text-white/70 text-xs">引用</div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <Link
                href={`/library/${paper.id}`}
                className="text-lg serif text-ink line-clamp-2 hover:text-coral transition-colors"
              >
                {paper.title}
              </Link>
              {paper.sourceUrl && (
                <a
                  href={paper.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 p-1 rounded hover:bg-paper-3 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-ink-3" />
                </a>
              )}
            </div>

            <p className="text-sm text-ink-4 mt-1 truncate">{renderAuthors(paper.authors)}</p>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className={chip}>{getSourceTypeLabel(paper.sourceType)}</span>
              {paper.direction && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-paper-3 text-ocean">
                  {paper.direction}
                </span>
              )}
              {paper.tags.map((tag) => (
                <span key={tag} className={cn(chip, "flex items-center gap-1")}>
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-4 mt-3 text-xs text-ink-4">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                导入于 {formatDate(paper.createdAt)}
              </span>
              {paper.publishedAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  发表于 {formatDate(paper.publishedAt)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onDelete}
        className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-ink-3 transition-colors hover:text-coral"
        title="删除论文"
      >
        <Trash2 className="w-4 h-4" />
        <span>删除</span>
      </button>

      {/* AI 分析折叠组件 */}
      <div className="border-t border-line">
        <button
          onClick={onToggleExpand}
          className="w-full px-5 py-3 flex items-center justify-between hover:bg-paper-2/50 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm text-ink">
            <Sparkles className="w-4 h-4 text-sun" />
            AI 关键介绍
            {!paper.summary && <span className="text-xs text-ink-3">（未分析）</span>}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-ink-3" />
          ) : (
            <ChevronDown className="w-4 h-4 text-ink-3" />
          )}
        </button>

        {expanded && (
          <div className="px-5 pb-5">
            {paper.summary || paper.methodology || paper.contribution ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-paper-2/60 border border-line">
                  <h4 className="overline mb-2 text-coral">🔍 研究问题</h4>
                  <p className="text-sm text-ink-2 leading-relaxed">{paper.summary || "暂无分析"}</p>
                </div>
                <div className="p-4 rounded-xl bg-paper-2/60 border border-line">
                  <h4 className="overline mb-2 text-ocean">🧠 核心方法</h4>
                  <p className="text-sm text-ink-2 leading-relaxed">{paper.methodology || "暂无分析"}</p>
                </div>
                <div className="p-4 rounded-xl bg-paper-2/60 border border-line">
                  <h4 className="overline mb-2 text-sage">✨ 创新点</h4>
                  <p className="text-sm text-ink-2 leading-relaxed">{paper.contribution || "暂无分析"}</p>
                </div>
                <div className="p-4 rounded-xl bg-paper-2/60 border border-line">
                  <h4 className="overline mb-2 text-plum">🚀 应用方向</h4>
                  <p className="text-sm text-ink-2 leading-relaxed">{paper.notes || "暂无分析"}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Sparkles className="w-12 h-12 mx-auto text-ink-4 mb-3" />
                <p className="text-sm text-ink-3 mb-4">点击下方按钮让 AI 分析这篇论文</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnalyze();
                  }}
                  className="cta-gradient rounded-full px-4 py-2 text-sm font-medium focus-ring"
                >
                  🔮 开始分析
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
