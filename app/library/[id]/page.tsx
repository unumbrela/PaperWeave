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
  Download,
  CheckCircle,
  FileQuestion,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { repository } from "@/lib/db/repository";
import { SendToTool } from "@/components/workflow/handoff-controls";

interface Author {
  name: string;
  affiliation?: string;
}

interface Paper {
  id: string;
  title: string;
  abstract?: string;
  authors: Author[];
  sourceType: "ARXIV" | "LOCAL" | "DOI";
  sourceUrl?: string;
  arxivId?: string;
  pdfPath?: string;
  publishedAt?: string;
  tags: string[];
  direction?: string;
  notes?: string;
  summary?: string;
  methodology?: string;
  contribution?: string;
  createdAt: string;
  citations: number;
}

export default function PaperDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfStatus, setPdfStatus] = useState<'checking' | 'downloaded' | 'downloading' | 'error' | 'not_downloaded'>('checking');
  const [localPdfPath, setLocalPdfPath] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPaper(id);
  }, [id]);

  useEffect(() => {
    if (paper) {
      checkAndDownloadPdf();
    }
  }, [paper]);

  async function fetchPaper(id: string) {
    setLoading(true);
    try {
      const found = await repository.getPaper(id);
      if (found) {
        setPaper(found as Paper);
      }
    } catch (error) {
      console.error("Failed to fetch paper:", error);
    } finally {
      setLoading(false);
    }
  }

  async function deletePaper() {
    if (!paper) return;

    setIsDeleting(true);
    try {
      await repository.deletePaper(paper.id);
      router.push('/library');
    } catch (error) {
      console.error('删除论文失败:', error);
      alert('删除论文失败');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  }

  async function checkAndDownloadPdf() {
    if (!paper) return;

    try {
      setPdfStatus('checking');
      
      const res = await fetch('/api/papers/download-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperId: paper.id,
          pdfUrl: paper.pdfPath,
          arxivId: paper.arxivId
        })
      });

      const data = await res.json();
      
      if (data.success) {
        if (data.alreadyDownloaded) {
          setPdfStatus('downloaded');
          setLocalPdfPath(data.pdfPath);
        } else {
          setPdfStatus('downloading');
          simulateDownload();
          setLocalPdfPath(data.pdfPath);
        }
      } else {
        setPdfStatus('error');
      }
    } catch (error) {
      console.error('PDF下载检查失败:', error);
      setPdfStatus('error');
    }
  }

  function simulateDownload() {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setPdfStatus('downloaded');
      }
      setDownloadProgress(Math.min(progress, 100));
    }, 200);
  }

  function renderPdfStatus() {
    switch (pdfStatus) {
      case 'checking':
        return (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            <span>检查PDF状态...</span>
          </div>
        );
      case 'downloading':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-600">
              <Download className="w-4 h-4 animate-pulse" />
              <span>正在下载PDF...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
            <div className="text-sm text-gray-500">{Math.round(downloadProgress)}%</div>
          </div>
        );
      case 'downloaded':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span>PDF已下载完成</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={localPdfPath || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FileText className="w-4 h-4" />
                在新标签页打开
              </a>
              <button
                onClick={() => window.location.href = `/viewer/${paper!.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                <FileText className="w-4 h-4" />
                进入精读模式
              </button>
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 text-red-500">
            <FileQuestion className="w-4 h-4" />
            <span>PDF下载失败</span>
            <button
              onClick={checkAndDownloadPdf}
              className="ml-2 px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
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
    const labels: Record<string, { label: string; className: string }> = {
      ARXIV: { label: "arXiv", className: "bg-purple-100 text-purple-700" },
      LOCAL: { label: "本地", className: "bg-gray-100 text-gray-700" },
      DOI: { label: "DOI", className: "bg-blue-100 text-blue-700" },
    };
    return labels[type] || { label: type, className: "bg-gray-100 text-gray-700" };
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
          <FileText className="w-16 h-16 mx-auto text-ink-2 mb-4" />
          <h3 className="text-xl font-medium text-ink mb-2">论文不存在</h3>
          <button
            onClick={() => router.push('/library')}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-[#ff5d4d] to-[#9b5de5] text-white rounded-lg text-sm font-medium"
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
      <div className="border-b border-line bg-[rgba(255,253,247,0.8)] backdrop-blur-sm sticky top-14 z-30">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/library')}
              className="flex items-center gap-2 text-sm text-ink-3 hover:text-ink transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回论文库
            </button>
            
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              删除论文
            </button>
          </div>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">确认删除</h3>
                <p className="text-sm text-gray-500">此操作无法撤销</p>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              确定要删除论文 <strong className="text-gray-900">{paper.title}</strong> 吗？所有相关的笔记和标注也会被删除。
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={deletePaper}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 论文详情 */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* 头部信息 */}
        <div className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* 引用次数标识 */}
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
                  <span className={cn("px-3 py-1 rounded-full text-xs font-medium", getSourceTypeLabel(paper.sourceType).className)}>
                    {getSourceTypeLabel(paper.sourceType).label}
                  </span>
                  {paper.arxivId && (
                    <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                      {paper.arxivId}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">{paper.title}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
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
              fields: {
                direction: paper.direction || paper.title,
                references: [paper.title, paper.abstract, paper.summary].filter(Boolean).join("\n\n"),
              },
            }}
            label="生成研究 idea"
          />
        </div>

        {/* 后续内容保持不变 */}
        <div className="space-y-6">
          {/* PDF下载状态 */}
          <div className="bg-white rounded-2xl border border-line shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              论文文档
            </h2>
            {renderPdfStatus()}
          </div>

          {/* 摘要 */}
          {paper.abstract && (
            <div className="bg-white rounded-2xl border border-line shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">摘要</h2>
              <p className="text-gray-600 leading-relaxed">{paper.abstract}</p>
            </div>
          )}

          {/* AI 分析 */}
          {(paper.summary || paper.methodology || paper.contribution) && (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-100 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                AI 分析总结
              </h2>
              <div className="space-y-4">
                {paper.summary && (
                  <div className="bg-white/60 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">📝 论文总结</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{paper.summary}</p>
                  </div>
                )}
                {paper.methodology && (
                  <div className="bg-white/60 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">🔬 方法论</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{paper.methodology}</p>
                  </div>
                )}
                {paper.contribution && (
                  <div className="bg-white/60 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">💡 主要贡献</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{paper.contribution}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 元信息 */}
          <div className="bg-white rounded-2xl border border-line shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">论文信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {paper.direction && (
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">研究方向：</span>
                  <span className="text-gray-900">{paper.direction}</span>
                </div>
              )}
              {paper.publishedAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">发表时间：</span>
                  <span className="text-gray-900">{formatDate(paper.publishedAt)}</span>
                </div>
              )}
              {paper.sourceUrl && (
                <div className="flex items-center gap-2 md:col-span-2">
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">来源链接：</span>
                  <a
                    href={paper.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate"
                  >
                    {paper.sourceUrl}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* 标签 */}
          {paper.tags && paper.tags.length > 0 && (
            <div className="bg-white rounded-2xl border border-line shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">标签</h2>
              <div className="flex flex-wrap gap-2">
                {paper.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
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
