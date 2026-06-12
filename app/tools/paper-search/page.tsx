"use client";

import { useState, useEffect, useRef } from "react";
import { Download, Loader2, AlertCircle, CheckSquare, Square, BookOpen, Layers } from "lucide-react";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { cn } from "@/lib/utils";
import { type SearchQuery, type PaperResult } from "@/lib/paper-search/types";
import { repository } from "@/lib/db/repository";
import { ApiSettings } from "@/components/paper-search/ApiSettings";
import { SearchForm } from "@/components/paper-search/SearchForm";
import { ResultCard } from "@/components/paper-search/ResultCard";
import { HotQueries } from "@/components/paper-search/HotQueries";

const TOOL = getTool("paper-search")!;

export default function Page() {
  const [apiConfig, setApiConfig] = useState<Record<string, string>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [selectedSources, setSelectedSources] = useState(["openalex", "arxiv"]);

  const [searchQuery, setSearchQuery] = useState<SearchQuery>({
    field: "",
    subField: "",
    keywords: "",
    startYear: new Date().getFullYear() - 2,
    endYear: new Date().getFullYear(),
    venues: [],
    maxResults: 30,
    sortBy: "relevance",
  });

  const [results, setResults] = useState<PaperResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [analysisResults, setAnalysisResults] = useState<Record<string, string>>({});
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);
  const [selectedPaperIds, setSelectedPaperIds] = useState<Set<string>>(new Set());
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem("paperSearchConfig");
    if (saved) {
      try {
        const config = JSON.parse(saved);
        // 挂载时一次性从 localStorage 水合配置，非级联渲染
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setApiConfig(config.apiConfig || {});
        setSelectedSources(config.sources || ["openalex", "arxiv"]);
      } catch {
        console.error("Failed to load search config");
      }
    }
  }, []);

  const searchAbortRef = useRef<AbortController | null>(null);

  const saveConfig = () => {
    localStorage.setItem("paperSearchConfig", JSON.stringify({ apiConfig, sources: selectedSources }));
    setShowSettings(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.keywords && !searchQuery.field && !searchQuery.researchGoal && !searchQuery.methodHints) {
      setError("请输入关键词或选择研究领域");
      return;
    }

    if (selectedSources.length === 0) {
      setError("请至少选择一个检索 API");
      return;
    }

    // 取消上一次仍在进行的检索，避免请求堆叠与结果错乱
    searchAbortRef.current?.abort();
    const ctl = new AbortController();
    searchAbortRef.current = ctl;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/paper-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...searchQuery,
          sources: selectedSources,
          apiKeys: { "semantic-scholar": apiConfig["semantic-scholar"] },
        }),
        signal: ctl.signal,
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.data);
        setSelectedPaperIds(new Set());
        const failed: string[] = Array.isArray(data.failedSources) ? data.failedSources : [];
        if (failed.length > 0) {
          if (data.data.length === 0) {
            // 全源失败：明确告知是上游问题而非"没有匹配论文"，并给出路
            setError(
              `所有检索源（${failed.join("、")}）均未返回结果：可能是网络问题或上游限流，请稍后重试，或在设置里换一个检索源。`,
            );
          } else {
            // 部分源失败：仍展示已得结果，并提示哪个源失败
            setError(`部分检索源未返回结果：${failed.join("、")}（已展示其余源的结果）`);
          }
        }
      } else {
        setError(data.error || "搜索失败");
      }
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      console.error("[PaperSearch] Error:", err);
      setError("网络错误，请重试: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      if (searchAbortRef.current === ctl) setIsLoading(false);
    }
  };

  /** 单篇入库；返回是否成功（已存在视为成功），供批量入库统计成败。 */
  const handleImport = async (paper: PaperResult): Promise<boolean> => {
    if (importingIds.has(paper.id)) return true;

    setImportingIds((prev) => new Set([...prev, paper.id]));

    try {
      const arxivId = paper.source === "arxiv" ? paper.id : undefined;
      // 去重：已在本地库则跳过（arXiv 按 arxivId；其他来源按标题精确匹配）
      if (arxivId && (await repository.arxivExists(arxivId))) {
        setImportedIds((prev) => new Set([...prev, paper.id]));
        return true;
      }
      if (!arxivId && (await repository.findPaperByTitle(paper.title))) {
        setImportedIds((prev) => new Set([...prev, paper.id]));
        return true;
      }
      // 直接落库到本地 Dexie（单一真相源）
      await repository.savePaper({
        title: paper.title,
        authors: (paper.authors ?? []).map((name) => ({ name })),
        abstract: paper.abstract,
        sourceType: paper.source === "arxiv" ? "ARXIV" : "LOCAL",
        sourceUrl: paper.url,
        pdfPath: paper.pdfUrl,
        arxivId,
        publishedAt: paper.year ? `${paper.year}-01-01` : undefined,
        tags: [paper.source, ...(paper.venue ? [paper.venue] : [])],
        citations: paper.citations,
      });
      setImportedIds((prev) => new Set([...prev, paper.id]));
      return true;
    } catch (err) {
      console.error("Import error:", err);
      setError(
        `「${paper.title}」入库失败：${err instanceof Error ? err.message : "本地存储写入异常"}，请重试。`,
      );
      return false;
    } finally {
      setImportingIds((prev) => {
        const next = new Set(prev);
        next.delete(paper.id);
        return next;
      });
    }
  };

  const selectedPapers = results.filter((paper) => selectedPaperIds.has(paper.id));

  const togglePaperSelection = (paperId: string) => {
    setSelectedPaperIds((prev) => {
      const next = new Set(prev);
      if (next.has(paperId)) next.delete(paperId);
      else next.add(paperId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedPaperIds((prev) =>
      prev.size === results.length ? new Set() : new Set(results.map((paper) => paper.id)),
    );
  };

  const handleBatchImport = async () => {
    const failed: string[] = [];
    for (const paper of selectedPapers) {
      if (!(await handleImport(paper))) failed.push(paper.title);
    }
    // 汇总成败：失败的逐篇列出（覆盖循环中逐篇设置的单条错误）
    if (failed.length > 0) {
      setError(
        `批量入库完成：${selectedPapers.length - failed.length} 篇成功，${failed.length} 篇失败（${failed.join("、")}），请重试失败项。`,
      );
    }
  };

  const openSummarizer = (paper: PaperResult) => {
    const targetUrl = paper.url || paper.pdfUrl;
    if (!targetUrl) return;
    window.open(`/tools/summarize?url=${encodeURIComponent(targetUrl)}`, "_blank");
  };

  const openMarkdownConverter = () => {
    const payload = selectedPapers
      .filter((paper) => paper.pdfUrl)
      .map((paper) => ({ title: paper.title, url: paper.pdfUrl, sourceUrl: paper.url }));
    localStorage.setItem("paperSearchMarkdownQueue", JSON.stringify(payload));
    window.open("/tools/markdown-convert?from=paper-search", "_blank");
  };

  const generateMarkdown = (papers: PaperResult[]): string => {
    let md = `# 论文搜索结果\n\n`;
    md += `搜索时间: ${new Date().toISOString()}\n`;
    md += `结果数量: ${papers.length}\n\n`;
    md += `---\n\n`;

    papers.forEach((paper, index) => {
      md += `## ${index + 1}. ${paper.title}\n\n`;
      md += `**作者**: ${paper.authors.join(", ")}\n\n`;
      if (paper.year) md += `**年份**: ${paper.year}\n\n`;
      if (paper.venue) md += `**期刊/会议**: ${paper.venue}\n\n`;
      if (paper.citations) md += `**引用数**: ${paper.citations}\n\n`;
      if (paper.abstract) md += `**摘要**: ${paper.abstract}\n\n`;
      md += `**链接**: [${paper.url}](${paper.url})\n\n`;
      if (paper.pdfUrl) md += `**PDF**: [下载](${paper.pdfUrl})\n\n`;
      md += `---\n\n`;
    });

    return md;
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    downloadFile(generateMarkdown(results), "paper-search-results.md");
  };

  const handleAnalyze = async (paper: PaperResult) => {
    if (analyzingIds.has(paper.id)) return;

    setAnalyzingIds((prev) => new Set([...prev, paper.id]));

    try {
      const response = await fetch("/api/analyze-paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: paper.title,
          abstract: paper.abstract,
          authors: paper.authors.join(", "),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setAnalysisResults((prev) => ({ ...prev, [paper.id]: data.data }));
        setExpandedPaperId(paper.id);
      } else {
        console.error("[PaperSearch] Analysis failed:", data.error);
        alert(`分析失败: ${data.error || "未知错误"}`);
      }
    } catch (err) {
      console.error("[PaperSearch] Analysis error:", err);
      alert(`分析失败: ${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.delete(paper.id);
        return next;
      });
    }
  };

  const toggleVenue = (venue: string) => {
    setSearchQuery((prev) => ({
      ...prev,
      venues: (prev.venues || []).includes(venue)
        ? (prev.venues || []).filter((v) => v !== venue)
        : [...(prev.venues || []), venue],
    }));
  };

  const toggleSource = (sourceId: string) => {
    setSelectedSources((prev) =>
      prev.includes(sourceId) ? prev.filter((s) => s !== sourceId) : [...prev, sourceId],
    );
  };

  const handleCopyLink = async (key: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedIds((prev) => new Set([...prev, key]));
      setTimeout(() => {
        setCopiedIds((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const toolbarBtn = cn(
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] text-ink-2",
    "hover:text-ink hover:bg-[rgba(26,23,19,0.04)] transition-colors",
    "disabled:opacity-40 disabled:pointer-events-none",
  );

  return (
    <ToolShell tool={TOOL}>
      {showSettings && (
        <ApiSettings
          apiConfig={apiConfig}
          setApiConfig={setApiConfig}
          selectedSources={selectedSources}
          toggleSource={toggleSource}
          onSave={saveConfig}
          onClose={() => setShowSettings(false)}
        />
      )}

      <div className="space-y-6">
        <SearchForm
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedSources={selectedSources}
          toggleSource={toggleSource}
          toggleVenue={toggleVenue}
          isLoading={isLoading}
          onSearch={handleSearch}
          onOpenSettings={() => setShowSettings(!showSettings)}
        />

        <HotQueries onPick={(kw) => setSearchQuery((prev) => ({ ...prev, keywords: kw }))} />

        <div className="surface rounded-[20px] min-h-[500px] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-block h-1.5 w-1.5 rounded-full",
                  isLoading ? "bg-plum animate-pulse" : results.length ? "bg-sage" : "bg-ink-4",
                )}
              />
              <span className="overline">
                {isLoading ? "搜索中" : results.length ? `${results.length} 篇论文` : "空闲"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {results.length > 0 && (
                <button onClick={toggleSelectAll} className={toolbarBtn}>
                  {selectedPaperIds.size === results.length ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  <span className="serif-italic">{selectedPaperIds.size ? `已选 ${selectedPaperIds.size}` : "全选"}</span>
                </button>
              )}
              <button
                onClick={handleBatchImport}
                disabled={selectedPapers.length === 0}
                className={cn(toolbarBtn, "text-plum hover:bg-plum/10 hover:text-plum")}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="serif-italic">批量入库</span>
              </button>
              <button
                onClick={openMarkdownConverter}
                disabled={selectedPapers.filter((paper) => paper.pdfUrl).length === 0}
                className={toolbarBtn}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="serif-italic">批量整理</span>
              </button>
              <button onClick={handleExport} disabled={!results.length} className={toolbarBtn}>
                <Download className="w-3.5 h-3.5" />
                <span className="serif-italic">导出</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-3">
            {error && (
              <div className="rounded-xl border border-[rgba(255,93,77,0.35)] bg-[rgba(255,93,77,0.08)] p-3 text-sm text-[#a53425]">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              </div>
            )}

            {!isLoading && results.length === 0 && !error && (
              <div className="flex h-full min-h-[300px] items-center justify-center text-center">
                <p className="serif-italic text-[22px] text-ink-3 max-w-xs leading-snug">
                  输入关键词或选择研究领域开始搜索
                </p>
              </div>
            )}

            {isLoading && (
              <div className="flex h-full min-h-[300px] items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-plum animate-spin mx-auto mb-3" />
                  <p className="text-sm text-ink-3">正在搜索论文...</p>
                </div>
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-3">
                {results.map((paper) => (
                  <ResultCard
                    key={paper.id}
                    paper={paper}
                    selected={selectedPaperIds.has(paper.id)}
                    importing={importingIds.has(paper.id)}
                    imported={importedIds.has(paper.id)}
                    analyzing={analyzingIds.has(paper.id)}
                    copied={copiedIds.has(paper.id)}
                    pdfCopied={copiedIds.has(paper.id + "-pdf")}
                    analysis={analysisResults[paper.id]}
                    expanded={expandedPaperId === paper.id}
                    onToggleSelect={() => togglePaperSelection(paper.id)}
                    onCopyLink={handleCopyLink}
                    onAnalyze={() => handleAnalyze(paper)}
                    onSummarize={() => openSummarizer(paper)}
                    onImport={() => handleImport(paper)}
                    onToggleExpand={() => setExpandedPaperId(expandedPaperId === paper.id ? null : paper.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
