"use client";

import { useState, useEffect } from "react";
import {
  Search, Filter, Upload, BookOpen, ChevronDown, ChevronUp, Trash2,
} from "lucide-react";
import { repository } from "@/lib/db/repository";
import type { Paper } from "@/lib/db/types";
import { userKeyHeaders } from "@/lib/ai/user-keys";
import { LIBRARY_CHANGED_EVENT } from "@/lib/sync/cloud-sync";
import { LoadingState, EmptyState, ErrorState } from "@/components/states";
import { ImportModal } from "@/components/library/ImportModal";
import { PaperCard } from "@/components/library/PaperCard";

export default function LibraryPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [selectedDirection, setSelectedDirection] = useState<string>("");
  const [sortBy, setSortBy] = useState<"createdAt" | "publishedAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState<"arxiv" | "pdf">("arxiv");
  const [arxivId, setArxivId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; paper: Paper | null }>({
    show: false,
    paper: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const allTags = [...new Set(papers.flatMap((p) => p.tags))];
  const allDirections = [...new Set(papers.map((p) => p.direction).filter(Boolean))];

  useEffect(() => {
    fetchPapers();
    // 登录后云端拉取合并完成时刷新列表
    const onChange = () => fetchPapers();
    window.addEventListener(LIBRARY_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(LIBRARY_CHANGED_EVENT, onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedTag, selectedDirection, sortBy, sortOrder]);

  async function fetchPapers() {
    setLoading(true);
    setError(null);
    try {
      // 从本地 Dexie 仓储读取（单一真相源）
      const data = await repository.listPapers({
        sortBy,
        sortOrder,
        ...(selectedTag && { tags: [selectedTag] }),
        ...(selectedDirection && { direction: selectedDirection }),
        ...(searchQuery && { search: searchQuery }),
      });
      setPapers(data);
    } catch (err) {
      console.error("Failed to fetch papers:", err);
      setError(err instanceof Error ? err.message : "读取本地论文库失败");
      setPapers([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePaper() {
    if (!deleteConfirm.paper) return;

    setIsDeleting(true);
    try {
      // 从本地仓储删除（级联删除标注/笔记/进度）
      await repository.deletePaper(deleteConfirm.paper.id);
      setPapers((prev) => prev.filter((p) => p.id !== deleteConfirm.paper!.id));
      setDeleteConfirm({ show: false, paper: null });
    } catch (error) {
      console.error("删除论文失败:", error);
      alert("删除论文失败");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleArxivImport() {
    if (!arxivId.trim()) return;

    // 检查本地是否已存在
    if (await repository.arxivExists(arxivId.trim())) {
      setImportMessage("⚠️ 该论文已在论文库中");
      return;
    }

    setImporting(true);
    setImportMessage("");

    try {
      // 服务端无状态助手：拉取元数据 + 下载 PDF，返回论文数据（不持久化）
      const res = await fetch("/api/papers/import/arxiv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arxivId: arxivId.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        // 落库到本地 Dexie（单一真相源）
        const newPaper = await repository.savePaper(data.data as Partial<Paper> & { title: string });
        setImportMessage("✅ 导入成功！");
        setArxivId("");
        setPapers((prev) => [newPaper, ...prev]);
        setTimeout(() => setShowImportModal(false), 1500);
      } else {
        setImportMessage(data.isDuplicate ? "⚠️ 该论文已存在" : "❌ " + data.message);
      }
    } catch {
      setImportMessage("❌ 导入失败，请重试");
    } finally {
      setImporting(false);
    }
  }

  async function handlePdfImport() {
    if (!selectedFile) return;

    setImporting(true);
    setImportMessage("");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/papers/import/pdf", { method: "POST", body: formData });

      const data = await res.json();

      if (data.success) {
        // 落库到本地 Dexie（单一真相源）
        const newPaper = await repository.savePaper(data.data as Partial<Paper> & { title: string });
        // PDF 原始二进制直接存为本地 Blob（服务端不再落盘），阅读页可离线打开
        try {
          await repository.cachePdfBlob(newPaper.id, selectedFile);
        } catch {
          // 缓存失败不影响入库
        }
        setImportMessage("✅ 导入成功！");
        setSelectedFile(null);
        setPapers((prev) => [newPaper, ...prev]);
        setTimeout(() => setShowImportModal(false), 1500);
      } else {
        setImportMessage(data.isDuplicate ? "⚠️ 该论文已存在" : "❌ " + data.message);
      }
    } catch {
      setImportMessage("❌ 导入失败，请重试");
    } finally {
      setImporting(false);
    }
  }

  async function handleAnalyze(paperId: string) {
    const target = papers.find((p) => p.id === paperId);
    if (!target) return;
    try {
      // 服务端无状态 AI 助手：传入摘要文本，返回结构化分析（不持久化）
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...userKeyHeaders() },
        body: JSON.stringify({ text: target.abstract || target.title }),
      });

      const data = await res.json();

      if (data.success) {
        const { summary, methodology, contribution, notes } = data.data as {
          summary?: string;
          methodology?: string;
          contribution?: string;
          notes?: string;
        };
        // 分析结果回写本地仓储
        const updated = await repository.updatePaper(paperId, { summary, methodology, contribution, notes });
        if (updated) {
          setPapers((prev) => prev.map((p) => (p.id === paperId ? { ...p, ...updated } : p)));
        }
      }
    } catch (error) {
      console.error("Failed to analyze paper:", error);
    }
  }

  function handleModeChange(mode: "arxiv" | "pdf") {
    setImportMode(mode);
    setImportMessage("");
    if (mode === "pdf") setSelectedFile(null);
  }

  return (
    <div className="min-h-screen">
      {/* 删除确认弹窗 */}
      {deleteConfirm.show && deleteConfirm.paper && (
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
              确定要删除论文 <strong className="text-ink">{deleteConfirm.paper.title}</strong> 吗？所有相关的笔记和标注也会被删除。
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm({ show: false, paper: null })}
                className="flex-1 rounded-full border border-line bg-paper-2/70 px-4 py-2 text-sm text-ink-2 transition-colors hover:border-line-strong hover:text-ink focus-ring"
              >
                取消
              </button>
              <button
                onClick={handleDeletePaper}
                disabled={isDeleting}
                className="flex-1 rounded-full bg-coral px-4 py-2 text-sm font-medium text-white transition-all hover:brightness-105 disabled:opacity-50 focus-ring"
              >
                {isDeleting ? "删除中…" : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 顶部栏 */}
      <div className="border-b border-line bg-glass-2 backdrop-blur-xl sticky top-14 z-30">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索论文标题或作者…"
                  className="w-full pl-10 pr-4 py-2 rounded-full border border-line bg-paper-2/80 text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:border-line-strong transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 rounded-full border border-line bg-paper-2/80 text-sm text-ink-2 focus:outline-none focus:border-line-strong cursor-pointer"
                >
                  <option value="">所有标签</option>
                  {allTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={selectedDirection}
                  onChange={(e) => setSelectedDirection(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 rounded-full border border-line bg-paper-2/80 text-sm text-ink-2 focus:outline-none focus:border-line-strong cursor-pointer"
                >
                  <option value="">所有方向</option>
                  {allDirections.map((dir) => (
                    <option key={dir} value={dir}>
                      {dir}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
              </div>

              <button
                onClick={() => setShowImportModal(true)}
                className="cta-gradient flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all focus-ring"
              >
                <Upload className="w-4 h-4" />
                导入论文
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 text-xs text-ink-3">
            <span className="flex items-center gap-1">
              <Filter className="w-3 h-3" />
              排序：
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "createdAt" | "publishedAt")}
              className="appearance-none bg-transparent text-ink-3 hover:text-ink cursor-pointer"
            >
              <option value="createdAt">导入时间</option>
              <option value="publishedAt">发表时间</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              className="hover:text-ink transition-colors"
            >
              {sortOrder === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* 论文列表 */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        {loading ? (
          <LoadingState count={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchPapers} />
        ) : papers.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-12 w-12" />}
            title={searchQuery || selectedTag || selectedDirection ? "没有匹配的论文" : "论文库还是空的"}
            hint={
              searchQuery || selectedTag || selectedDirection
                ? "换个关键词或清除筛选条件试试。"
                : "从「论文调研搜索」入库，或点右上角按钮导入 arXiv / PDF。"
            }
            action={
              <button
                onClick={() => setShowImportModal(true)}
                className="cta-gradient rounded-full px-6 py-2 text-sm font-medium focus-ring"
              >
                导入论文
              </button>
            }
          />
        ) : (
          <div className="space-y-4">
            {papers.map((paper) => (
              <PaperCard
                key={paper.id}
                paper={paper}
                expanded={openAccordion === paper.id}
                onToggleExpand={() => setOpenAccordion(openAccordion === paper.id ? null : paper.id)}
                onDelete={() => setDeleteConfirm({ show: true, paper })}
                onAnalyze={() => handleAnalyze(paper.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 导入论文弹窗 */}
      {showImportModal && (
        <ImportModal
          mode={importMode}
          onModeChange={handleModeChange}
          arxivId={arxivId}
          setArxivId={setArxivId}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          importing={importing}
          importMessage={importMessage}
          onArxivImport={handleArxivImport}
          onPdfImport={handlePdfImport}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
}
