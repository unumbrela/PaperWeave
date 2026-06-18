"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Download, Loader2, AlertCircle, CheckSquare, Square, BookOpen, Layers,
  Sparkles, History, X,
} from "lucide-react";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { cn } from "@/lib/utils";
import { type SearchQuery, type PaperResult } from "@/lib/paper-search/types";
import {
  applyRefine, sortResults, isRefineActive, EMPTY_REFINE,
  type RefineState, type ClientSort,
} from "@/lib/paper-search/refine";
import { getRecentSearches, pushRecentSearch, clearRecentSearches } from "@/lib/paper-search/history";
import { repository } from "@/lib/db/repository";
import { userKeyHeaders } from "@/lib/ai/user-keys";
import { ApiSettings } from "@/components/paper-search/ApiSettings";
import { SearchForm } from "@/components/paper-search/SearchForm";
import { ResultCard } from "@/components/paper-search/ResultCard";
import { RefinePanel } from "@/components/paper-search/RefinePanel";
import { HotQueries } from "@/components/paper-search/HotQueries";

const TOOL = getTool("paper-search")!;

const PAGE_SIZE = 20;

const SORT_OPTIONS: Array<{ id: ClientSort; label: string }> = [
  { id: "relevance", label: "综合" },
  { id: "citations", label: "被引" },
  { id: "year", label: "最新" },
];

export default function Page() {
  const router = useRouter();
  const [apiConfig, setApiConfig] = useState<Record<string, string>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [selectedSources, setSelectedSources] = useState(["openalex", "arxiv", "crossref"]);

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
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [analysisResults, setAnalysisResults] = useState<Record<string, string>>({});
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);
  const [selectedPaperIds, setSelectedPaperIds] = useState<Set<string>>(new Set());
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const [quickSummaries, setQuickSummaries] = useState<Record<string, string>>({});
  const [quickPositions, setQuickPositions] = useState<Record<string, string>>({});
  const [glancing, setGlancing] = useState(false);

  // 搜后客户端精炼 / 重排 / 分页展示
  const [refine, setRefine] = useState<RefineState>(EMPTY_REFINE);
  const [clientSort, setClientSort] = useState<ClientSort>("relevance");
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [recent, setRecent] = useState<string[]>([]);

  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("paperSearchConfig");
    if (saved) {
      try {
        const config = JSON.parse(saved);
        // 挂载时一次性从 localStorage 水合配置，非级联渲染
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setApiConfig(config.apiConfig || {});
        setSelectedSources(config.sources || ["openalex", "arxiv", "crossref"]);
      } catch {
        console.error("Failed to load search config");
      }
    }
    setRecent(getRecentSearches());
  }, []);

  const searchAbortRef = useRef<AbortController | null>(null);

  const saveConfig = () => {
    localStorage.setItem("paperSearchConfig", JSON.stringify({ apiConfig, sources: selectedSources }));
    setShowSettings(false);
  };

  /** 执行检索；override 用于「点 chip 即搜」时绕过 setState 的异步性。 */
  const handleSearch = async (override?: Partial<SearchQuery>) => {
    const query = { ...searchQuery, ...override };

    if (!query.keywords && !query.field && !query.researchGoal && !query.methodHints) {
      setError("请输入关键词或选择研究领域");
      return;
    }
    if (selectedSources.length === 0) {
      setError("请至少选择一个检索源");
      return;
    }

    // 取消上一次仍在进行的检索，避免请求堆叠与结果错乱
    searchAbortRef.current?.abort();
    const ctl = new AbortController();
    searchAbortRef.current = ctl;

    setIsLoading(true);
    setHasSearched(true);
    setError(null);

    try {
      const response = await fetch("/api/paper-search", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...userKeyHeaders() },
        body: JSON.stringify({
          ...query,
          sources: selectedSources,
          apiKeys: { "semantic-scholar": apiConfig["semantic-scholar"] },
        }),
        signal: ctl.signal,
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.data);
        // 新结果到达：清空上一轮的精炼 / 选择 / 速览，回到首屏
        setRefine(EMPTY_REFINE);
        setClientSort(query.sortBy || "relevance");
        setDisplayCount(PAGE_SIZE);
        setSelectedPaperIds(new Set());
        setQuickSummaries({});
        setQuickPositions({});
        if (query.keywords?.trim()) setRecent(pushRecentSearch(query.keywords));
        if (data.data.length > 0) {
          requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
        }

        const failed: string[] = Array.isArray(data.failedSources) ? data.failedSources : [];
        if (failed.length > 0) {
          if (data.data.length === 0) {
            // 全源失败：明确告知是上游问题而非"没有匹配论文"，并给出路
            setError(
              `所有检索源（${failed.join("、")}）均未返回结果：可能是网络问题或上游限流，请稍后重试，或换一个检索源。`,
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

  /** 点 chip（快速方向包 / 热门 / 最近检索）：填充关键词并立即检索。 */
  const handleSearchWith = (keywords: string) => {
    setSearchQuery((prev) => ({ ...prev, keywords }));
    handleSearch({ keywords });
  };

  /** 单篇入库；返回落库后的本地 paper id（已存在返回已有 id，失败返回 null）。 */
  const handleImport = async (paper: PaperResult): Promise<string | null> => {
    if (importingIds.has(paper.id)) return null;

    setImportingIds((prev) => new Set([...prev, paper.id]));

    try {
      const arxivId = paper.source === "arxiv" ? paper.id : undefined;
      // 去重：已在本地库则跳过（arXiv 按 arxivId；其他来源按标题精确匹配）
      if (arxivId) {
        const existing = await repository.getPaperByArxivId(arxivId);
        if (existing) {
          setImportedIds((prev) => new Set([...prev, paper.id]));
          return existing.id;
        }
      } else {
        const existing = await repository.findPaperByTitle(paper.title);
        if (existing) {
          setImportedIds((prev) => new Set([...prev, paper.id]));
          return existing.id;
        }
      }
      // 远端 PDF 经同源代理（无 CORS、viewer 读取后缓存为本地 Blob，与 arXiv 导入路由一致）
      const pdfPath = paper.pdfUrl
        ? `/api/pdf-proxy?url=${encodeURIComponent(paper.pdfUrl)}`
        : undefined;
      // 直接落库到本地 Dexie（单一真相源）；速览总结一并写入 summary，下游对比/RAG 复用
      const saved = await repository.savePaper({
        title: paper.title,
        authors: (paper.authors ?? []).map((name) => ({ name })),
        abstract: paper.abstract,
        sourceType: paper.source === "arxiv" ? "ARXIV" : "LOCAL",
        sourceUrl: paper.url,
        pdfPath,
        arxivId,
        publishedAt: paper.year ? `${paper.year}-01-01` : undefined,
        tags: [paper.source, ...(paper.venue ? [paper.venue] : [])],
        citations: paper.citations,
        summary: quickSummaries[paper.id],
      });
      setImportedIds((prev) => new Set([...prev, paper.id]));
      return saved.id;
    } catch (err) {
      console.error("Import error:", err);
      setError(
        `「${paper.title}」入库失败：${err instanceof Error ? err.message : "本地存储写入异常"}，请重试。`,
      );
      return null;
    } finally {
      setImportingIds((prev) => {
        const next = new Set(prev);
        next.delete(paper.id);
        return next;
      });
    }
  };

  /** 一键阅读：自动入库（已存在直接复用）后直达 PDF 阅读器。 */
  const handleRead = async (paper: PaperResult) => {
    const id = await handleImport(paper);
    if (id) router.push(`/viewer/${id}`);
  };

  // 客户端精炼 + 重排后的展示集
  const displayed = useMemo(
    () => sortResults(applyRefine(results, refine), clientSort),
    [results, refine, clientSort],
  );
  const visible = displayed.slice(0, displayCount);
  const selectedPapers = displayed.filter((paper) => selectedPaperIds.has(paper.id));

  /** 一键速览：把展示中的结果（标题 + 摘要）打包成一次 LLM 调用，逐篇填回一句话总结。 */
  const handleQuickGlance = async () => {
    if (glancing || displayed.length === 0) return;
    setGlancing(true);
    setError(null);

    try {
      // 服务端单次上限 30 篇；优先总结当前展示集中还没有总结的
      const pending = displayed.filter((p) => !quickSummaries[p.id]).slice(0, 30);
      if (pending.length === 0) return;

      const response = await fetch("/api/quick-summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...userKeyHeaders() },
        body: JSON.stringify({
          papers: pending.map((p) => ({ id: p.id, title: p.title, abstract: p.abstract })),
        }),
      });
      const data = await response.json();

      if (data.success) {
        // 后端返回 { id: { summary, position } }，拆成两张表分别喂给卡片与入库
        const glances = data.data as Record<string, { summary: string; position?: string }>;
        const sums: Record<string, string> = {};
        const poss: Record<string, string> = {};
        for (const [id, g] of Object.entries(glances)) {
          if (g?.summary) sums[id] = g.summary;
          if (g?.position) poss[id] = g.position;
        }
        setQuickSummaries((prev) => ({ ...prev, ...sums }));
        setQuickPositions((prev) => ({ ...prev, ...poss }));
      } else {
        setError(data.error || "速览失败");
      }
    } catch (err) {
      console.error("[PaperSearch] Quick glance error:", err);
      setError(`速览失败：${err instanceof Error ? err.message : "网络错误"}`);
    } finally {
      setGlancing(false);
    }
  };

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
      prev.size === displayed.length ? new Set() : new Set(displayed.map((paper) => paper.id)),
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
      if (quickSummaries[paper.id]) md += `**一句话速览**: ${quickSummaries[paper.id]}\n\n`;
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
    downloadFile(generateMarkdown(displayed), "paper-search-results.md");
  };

  const handleAnalyze = async (paper: PaperResult) => {
    if (analyzingIds.has(paper.id)) return;

    setAnalyzingIds((prev) => new Set([...prev, paper.id]));

    try {
      const response = await fetch("/api/analyze-paper", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...userKeyHeaders() },
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
        setError(`AI 分析失败：${data.error || "未知错误"}`);
      }
    } catch (err) {
      console.error("[PaperSearch] Analysis error:", err);
      setError(`AI 分析失败：${err instanceof Error ? err.message : "未知错误"}`);
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
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] text-ink-2",
    "hover:text-ink hover:bg-[rgba(26,23,19,0.04)] transition-colors",
    "disabled:opacity-40 disabled:pointer-events-none",
  );

  const refined = isRefineActive(refine);

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

      <div className="space-y-5">
        <SearchForm
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedSources={selectedSources}
          toggleSource={toggleSource}
          toggleVenue={toggleVenue}
          isLoading={isLoading}
          onSearch={() => handleSearch()}
          onSearchWith={handleSearchWith}
          onOpenSettings={() => setShowSettings(!showSettings)}
        />

        {/* 热门 + 最近检索 */}
        <div className="space-y-2 px-1">
          <HotQueries onPick={handleSearchWith} />
          {recent.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[12px] text-ink-3">
                <History className="h-3.5 w-3.5 text-ink-4" />
                <span className="overline">最近检索</span>
              </span>
              {recent.map((kw) => (
                <button
                  key={kw}
                  onClick={() => handleSearchWith(kw)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-[rgba(26,23,19,0.02)] px-3 py-1 text-[12px] text-ink-2 transition-colors hover:border-plum/40 hover:text-ink"
                >
                  <span className="serif-italic max-w-[180px] truncate">{kw}</span>
                </button>
              ))}
              <button
                onClick={() => {
                  clearRecentSearches();
                  setRecent([]);
                }}
                className="rounded-full p-1 text-ink-4 transition-colors hover:text-ink-2"
                title="清空最近检索"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* 结果区：左结果流 + 右精炼栏 */}
        <div ref={resultsRef} className="grid gap-5 scroll-mt-24 lg:grid-cols-[minmax(0,1fr)_228px]">
          <section className="surface flex min-h-[480px] flex-col overflow-hidden rounded-[20px]">
            {/* 工具条 */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-2.5 sm:px-5">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-block h-1.5 w-1.5 rounded-full",
                    isLoading ? "animate-pulse bg-plum" : results.length ? "bg-sage" : "bg-ink-4",
                  )}
                />
                <span className="overline">
                  {isLoading
                    ? "检索中"
                    : results.length
                      ? refined
                        ? `精炼 ${displayed.length} / ${results.length} 篇`
                        : `${results.length} 篇论文`
                      : "空闲"}
                </span>
                {refined && (
                  <button
                    onClick={() => setRefine(EMPTY_REFINE)}
                    className="text-[11px] text-plum transition-colors hover:text-plum/70"
                  >
                    清除精炼
                  </button>
                )}
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-1">
                {results.length > 0 && (
                  <>
                    {/* 客户端重排序 */}
                    <div className="mr-1 flex items-center rounded-full border border-line bg-paper-2/50 p-0.5">
                      {SORT_OPTIONS.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setClientSort(s.id)}
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[11.5px] transition-all",
                            clientSort === s.id
                              ? "bg-ink text-paper-2"
                              : "text-ink-3 hover:text-ink",
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleQuickGlance}
                      disabled={glancing}
                      className={cn(toolbarBtn, "text-[#8a6d1a] hover:bg-sun/20 hover:text-[#8a6d1a]")}
                      title="LLM 为每篇结果生成一句话简介 + 方向定位（一次批量调用，最多 30 篇）"
                    >
                      {glancing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      <span className="serif-italic">{glancing ? "速览中" : "一键速览"}</span>
                    </button>
                    <button onClick={toggleSelectAll} className={toolbarBtn}>
                      {selectedPaperIds.size === displayed.length && displayed.length > 0 ? (
                        <CheckSquare className="h-3.5 w-3.5" />
                      ) : (
                        <Square className="h-3.5 w-3.5" />
                      )}
                      <span className="serif-italic">{selectedPaperIds.size ? `已选 ${selectedPaperIds.size}` : "全选"}</span>
                    </button>
                    <button
                      onClick={handleBatchImport}
                      disabled={selectedPapers.length === 0}
                      className={cn(toolbarBtn, "text-plum hover:bg-plum/10 hover:text-plum")}
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span className="serif-italic">批量入库</span>
                    </button>
                    <button
                      onClick={openMarkdownConverter}
                      disabled={selectedPapers.filter((paper) => paper.pdfUrl).length === 0}
                      className={toolbarBtn}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span className="serif-italic">批量整理</span>
                    </button>
                    <button onClick={handleExport} disabled={!displayed.length} className={toolbarBtn}>
                      <Download className="h-3.5 w-3.5" />
                      <span className="serif-italic">导出</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 错误条 */}
            {error && (
              <div className="mx-4 mt-3 rounded-xl border border-[rgba(255,93,77,0.35)] bg-[rgba(255,93,77,0.08)] p-3 text-sm text-[#a53425] sm:mx-5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button onClick={() => setError(null)} className="shrink-0 opacity-60 hover:opacity-100">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* 骨架屏 */}
            {isLoading && (
              <div className="flex-1 divide-y divide-[var(--line)]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse px-6 py-5" style={{ animationDelay: `${i * 150}ms` }}>
                    <div className="h-2.5 w-44 rounded bg-[rgba(26,23,19,0.07)]" />
                    <div className="mt-3 h-4 w-3/4 rounded bg-[rgba(26,23,19,0.09)]" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-[rgba(26,23,19,0.06)]" />
                    <div className="mt-3 h-3 w-full rounded bg-[rgba(26,23,19,0.05)]" />
                    <div className="mt-1.5 h-3 w-5/6 rounded bg-[rgba(26,23,19,0.05)]" />
                  </div>
                ))}
              </div>
            )}

            {/* 初始空态 */}
            {!isLoading && !hasSearched && results.length === 0 && (
              <div className="flex flex-1 items-center justify-center p-8 text-center">
                <div>
                  <p className="serif-italic mx-auto max-w-sm text-[24px] leading-snug text-ink-3">
                    输入关键词，或点一个方向包开始
                  </p>
                  <p className="mono mt-3 text-[11px] uppercase tracking-wider text-ink-4">
                    OpenAlex · arXiv · Crossref · Semantic Scholar
                  </p>
                </div>
              </div>
            )}

            {/* 检索后无结果 */}
            {!isLoading && hasSearched && results.length === 0 && !error && (
              <div className="flex flex-1 items-center justify-center p-8 text-center">
                <p className="serif-italic max-w-xs text-[20px] leading-snug text-ink-3">
                  没有找到匹配的论文 — 试试更换关键词或放宽年份
                </p>
              </div>
            )}

            {/* 精炼后为空 */}
            {!isLoading && results.length > 0 && displayed.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <p className="serif-italic text-[20px] text-ink-3">当前精炼条件下没有结果</p>
                <button
                  onClick={() => setRefine(EMPTY_REFINE)}
                  className="rounded-full border border-line px-4 py-1.5 text-[12.5px] text-ink-2 transition-colors hover:border-plum/40 hover:text-ink"
                >
                  重置精炼条件
                </button>
              </div>
            )}

            {/* 结果目录流 */}
            {!isLoading && visible.length > 0 && (
              <>
                <div className="flex-1 divide-y divide-[var(--line)]">
                  {visible.map((paper, i) => (
                    <ResultCard
                      key={paper.id}
                      paper={paper}
                      index={i}
                      selected={selectedPaperIds.has(paper.id)}
                      importing={importingIds.has(paper.id)}
                      imported={importedIds.has(paper.id)}
                      analyzing={analyzingIds.has(paper.id)}
                      copied={copiedIds.has(paper.id)}
                      analysis={analysisResults[paper.id]}
                      quickSummary={quickSummaries[paper.id]}
                      position={quickPositions[paper.id]}
                      expanded={expandedPaperId === paper.id}
                      onToggleSelect={() => togglePaperSelection(paper.id)}
                      onCopyLink={handleCopyLink}
                      onAnalyze={() => handleAnalyze(paper)}
                      onSummarize={() => openSummarizer(paper)}
                      onImport={() => handleImport(paper)}
                      onRead={() => handleRead(paper)}
                      onToggleExpand={() => setExpandedPaperId(expandedPaperId === paper.id ? null : paper.id)}
                    />
                  ))}
                </div>
                {visible.length < displayed.length && (
                  <div className="border-t border-line p-3 text-center">
                    <button
                      onClick={() => setDisplayCount((n) => n + PAGE_SIZE)}
                      className="rounded-full border border-line px-5 py-2 text-[12.5px] text-ink-2 transition-colors hover:border-plum/40 hover:text-ink"
                    >
                      加载更多（还有 {displayed.length - visible.length} 篇）
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          {/* 右侧精炼栏（lg+） */}
          <aside className="hidden lg:block">
            <RefinePanel results={results} refine={refine} onChange={(next) => {
              setRefine(next);
              setDisplayCount(PAGE_SIZE);
            }} />
          </aside>
        </div>
      </div>
    </ToolShell>
  );
}
