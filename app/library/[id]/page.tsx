"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Tag,
  Sparkles,
  ExternalLink,
  FileText,
  Users,
  CheckCircle,
  FileQuestion,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { repository } from "@/lib/db/repository";
import type { Paper, Author } from "@/lib/db/types";
import { SendToTool } from "@/components/workflow/handoff-controls";

type PdfStatus = "checking" | "downloaded" | "error";

export default function PaperDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfStatus, setPdfStatus] = useState<PdfStatus>("checking");
  const [localPdfPath, setLocalPdfPath] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const found = await repository.getPaper(id);
        if (cancelled) return;
        if (found) setPaper(found);
      } catch (error) {
        console.error("Failed to fetch paper:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!paper) return;
    let cancelled = false;
    // 内联 async IIFE：await 在先，避免 effect 同步 setState 触发级联渲染
    (async () => {
      const blob = await repository.getPdfBlob(paper.id);
      if (cancelled) return;
      if (blob) {
        setLocalPdfPath(URL.createObjectURL(blob));
        setPdfStatus("downloaded");
        return;
      }
      if (paper.pdfPath) {
        setLocalPdfPath(paper.pdfPath);
        setPdfStatus("downloaded");
      } else {
        setPdfStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paper]);

  async function deletePaper() {
    if (!paper) return;

    setIsDeleting(true);
    try {
      await repository.deletePaper(paper.id);
      router.push("/library");
    } catch (error) {
      console.error("删除论文失败:", error);
      alert("删除论文失败");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  }

  async function checkAndDownloadPdf() {
    if (!paper) return;

    try {
      // 纯客户端解析，不再走服务端下载落盘（Vercel 文件系统只读）：
      // 优先本地离线缓存的 Blob；否则用 pdfPath（arXiv 走同源 /api/pdf-proxy，或远端链接）。
      const blob = await repository.getPdfBlob(paper.id);
      if (blob) {
        setLocalPdfPath(URL.createObjectURL(blob));
        setPdfStatus("downloaded");
        return;
      }

      if (paper.pdfPath) {
        setLocalPdfPath(paper.pdfPath);
        setPdfStatus("downloaded");
      } else {
        setPdfStatus("error");
      }
    } catch (error) {
      console.error("PDF 准备失败:", error);
      setPdfStatus("error");
    }
  }

  function renderPdfStatus() {
    switch (pdfStatus) {
      case "checking":
        return (
          <div className="flex items-center gap-2 text-ink-3 text-sm">
            <div className="w-4 h-4 border-2 border-ink-4 border-t-transparent rounded-full animate-spin" />
            <span>正在准备 PDF…</span>
          </div>
        );
      case "downloaded":
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sage text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>PDF 已就绪</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={localPdfPath || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-2/70 px-4 py-2 text-[13px] font-medium text-ink-2 transition-all hover:border-line-strong hover:text-ink focus-ring"
              >
                <FileText className="w-4 h-4" />
                在新标签页打开
              </a>
              <button
                onClick={() => (window.location.href = `/viewer/${paper!.id}`)}
                className="cta-gradient inline-flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-medium transition-all focus-ring"
              >
                <FileText className="w-4 h-4" />
                进入精读模式
              </button>
            </div>
          </div>
        );
      case "error":
        return (
          <div className="flex items-center gap-2 text-sm text-coral">
            <FileQuestion className="w-4 h-4" />
            <span>PDF 暂时无法获取</span>
            <button
              onClick={() => {
                setPdfStatus("checking");
                checkAndDownloadPdf();
              }}
              className="ml-2 rounded-full border border-line bg-paper-2/70 px-3 py-1 text-ink-2 transition-colors hover:border-line-strong hover:text-ink focus-ring"
            >
              重试
            </button>
          </div>
        );
      default:
        return null;
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

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
    if (count >= 10000) {
      return (count / 1000).toFixed(0) + "k";
    }
    return count.toString();
  }

  function getSourceTypeLabel(type: string) {
    const labels: Record<string, string> = {
      ARXIV: "arXiv",
      LOCAL: "本地",
      DOI: "DOI",
    };
    return labels[type] || type;
  }

  function renderAuthors(authors: Author[]) {
    if (authors.length === 0) return "未知作者";
    return authors.map((a) => a.name).join(", ");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-coral border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto text-ink-4 mb-4" />
          <h3 className="text-xl serif text-ink mb-2">论文不存在</h3>
          <button
            onClick={() => router.push("/library")}
            className="cta-gradient mt-4 rounded-full px-5 py-2 text-sm font-medium focus-ring"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* 顶部导航 */}
      <div className="border-b border-line bg-glass-2 backdrop-blur-xl sticky top-14 z-30">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/library")}
              className="flex items-center gap-2 text-sm text-ink-3 hover:text-ink transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回论文库
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-ink-3 transition-colors hover:text-coral"
            >
              <Trash2 className="w-4 h-4" />
              删除论文
            </button>
          </div>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="surface-strong rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-coral/12 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-coral" />
              </div>
              <div>
                <h3 className="text-lg serif text-ink">确认删除</h3>
                <p className="text-sm text-ink-3">此操作无法撤销</p>
              </div>
            </div>

            <p className="text-ink-2 mb-6 text-sm leading-relaxed">
              确定要删除论文 <strong className="text-ink">{paper.title}</strong> 吗？所有相关的笔记和标注也会被删除。
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-full border border-line bg-paper-2/70 px-4 py-2 text-sm text-ink-2 transition-colors hover:border-line-strong hover:text-ink focus-ring"
              >
                取消
              </button>
              <button
                onClick={deletePaper}
                disabled={isDeleting}
                className="flex-1 rounded-full bg-coral px-4 py-2 text-sm font-medium text-white transition-all hover:brightness-105 disabled:opacity-50 focus-ring"
              >
                {isDeleting ? "删除中…" : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 论文详情 */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* 头部信息 */}
        <div className="surface rounded-2xl overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* 引用次数标识（热度色阶编码引用量） */}
              <div
                className={cn(
                  "flex-shrink-0 w-20 h-20 rounded-xl flex items-center justify-center",
                  "bg-gradient-to-br " + getCitationColor(paper.citations)
                )}
              >
                <div className="text-center text-white">
                  <div className="text-2xl font-bold">{formatCitations(paper.citations)}</div>
                  <div className="text-xs opacity-80">引用</div>
                </div>
              </div>

              {/* 标题和标签 */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="overline px-2.5 py-1 rounded-full bg-paper-3 text-ink-3">
                    {getSourceTypeLabel(paper.sourceType)}
                  </span>
                  {paper.arxivId && (
                    <span className="mono text-[11px] px-2.5 py-1 rounded-full bg-paper-3 text-ink-3">
                      {paper.arxivId}
                    </span>
                  )}
                </div>
                <h1 className="serif text-2xl text-ink mb-3 leading-snug">{paper.title}</h1>
                <div className="flex items-center gap-2 text-sm text-ink-3">
                  <Users className="w-4 h-4" />
                  <span>{renderAuthors(paper.authors)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 下一步：把这篇论文送往下游工具，打通工作流 */}
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-paper-2/50 px-5 py-4">
          <span className="overline mr-1">下一步</span>
          <SendToTool
            targetSlug="markdown-summarize"
            payload={{
              from: paper.title.slice(0, 24) + (paper.title.length > 24 ? "…" : ""),
              sourcePaperId: paper.id,
              fields: {
                markdown: [
                  `# ${paper.title}`,
                  paper.abstract ? `\n## Abstract\n\n${paper.abstract}` : "",
                  paper.summary ? `\n## Summary\n\n${paper.summary}` : "",
                  paper.methodology ? `\n## Methodology\n\n${paper.methodology}` : "",
                  paper.contribution ? `\n## Contribution\n\n${paper.contribution}` : "",
                ].join("\n"),
              },
            }}
            label="做结构化总结"
          />
          <SendToTool
            targetSlug="idea-generator"
            payload={{
              from: paper.title.slice(0, 24) + (paper.title.length > 24 ? "…" : ""),
              sourcePaperId: paper.id,
              fields: {
                direction: paper.direction || paper.title,
                references: [paper.title, paper.abstract, paper.summary].filter(Boolean).join("\n\n"),
              },
            }}
            label="生成研究 idea"
          />
        </div>

        <div className="space-y-6">
          {/* PDF 状态 */}
          <div className="surface rounded-2xl p-6">
            <h2 className="serif text-lg text-ink mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-ocean" />
              论文文档
            </h2>
            {renderPdfStatus()}
          </div>

          {/* 摘要 */}
          {paper.abstract && (
            <div className="surface rounded-2xl p-6">
              <h2 className="serif text-lg text-ink mb-3">摘要</h2>
              <p className="text-ink-2 leading-relaxed text-[15px]">{paper.abstract}</p>
            </div>
          )}

          {/* AI 分析 */}
          {(paper.summary || paper.methodology || paper.contribution) && (
            <div className="surface rounded-2xl p-6">
              <h2 className="serif text-lg text-ink mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-plum" />
                AI 分析总结
              </h2>
              <div className="space-y-4">
                {paper.summary && (
                  <div className="rounded-xl bg-paper-2/60 border border-line p-4">
                    <h3 className="overline mb-2">论文总结</h3>
                    <p className="text-ink-2 text-sm leading-relaxed">{paper.summary}</p>
                  </div>
                )}
                {paper.methodology && (
                  <div className="rounded-xl bg-paper-2/60 border border-line p-4">
                    <h3 className="overline mb-2">方法论</h3>
                    <p className="text-ink-2 text-sm leading-relaxed">{paper.methodology}</p>
                  </div>
                )}
                {paper.contribution && (
                  <div className="rounded-xl bg-paper-2/60 border border-line p-4">
                    <h3 className="overline mb-2">主要贡献</h3>
                    <p className="text-ink-2 text-sm leading-relaxed">{paper.contribution}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 研究笔记（含从「Idea 生成器」回存的产出） */}
          {paper.notes && paper.notes.trim() && (
            <div className="surface rounded-2xl p-6">
              <h2 className="serif text-lg text-ink mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-sun" />
                研究笔记
              </h2>
              <p className="text-ink-2 text-sm leading-relaxed whitespace-pre-wrap">
                {paper.notes}
              </p>
            </div>
          )}

          {/* 元信息 */}
          <div className="surface rounded-2xl p-6">
            <h2 className="serif text-lg text-ink mb-4">论文信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {paper.direction && (
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-ink-4" />
                  <span className="text-ink-3">研究方向：</span>
                  <span className="text-ink">{paper.direction}</span>
                </div>
              )}
              {paper.publishedAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-ink-4" />
                  <span className="text-ink-3">发表时间：</span>
                  <span className="text-ink">{formatDate(paper.publishedAt)}</span>
                </div>
              )}
              {paper.sourceUrl && (
                <div className="flex items-center gap-2 md:col-span-2">
                  <ExternalLink className="w-4 h-4 text-ink-4" />
                  <span className="text-ink-3">来源链接：</span>
                  <a
                    href={paper.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ocean hover:underline truncate"
                  >
                    {paper.sourceUrl}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* 标签 */}
          {paper.tags && paper.tags.length > 0 && (
            <div className="surface rounded-2xl p-6">
              <h2 className="serif text-lg text-ink mb-3">标签</h2>
              <div className="flex flex-wrap gap-2">
                {paper.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-full bg-paper-3 text-ink-2 text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
