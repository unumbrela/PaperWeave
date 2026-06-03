"use client";

import { useState, useEffect } from "react";
import { Settings, X, Plus, ExternalLink, Download, ChevronDown, Loader2, AlertCircle, Sparkles, ChevronRight, CheckSquare, Square, BookOpen, FileText, Layers, Copy, Check } from "lucide-react";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { cn } from "@/lib/utils";
import { RESEARCH_FIELDS, VENUES, SEARCH_SOURCES, VENUE_MAP, getVenuesForField, type SearchQuery, type PaperResult } from "@/lib/paper-search/types";
import { repository } from "@/lib/db/repository";

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
        setApiConfig(config.apiConfig || {});
        setSelectedSources(config.sources || ["openalex", "arxiv"]);
      } catch {
        console.error("Failed to load search config");
      }
    }
  }, []);

  const saveConfig = () => {
    localStorage.setItem("paperSearchConfig", JSON.stringify({
      apiConfig,
      sources: selectedSources,
    }));
    setShowSettings(false);
  };

  const handleSearch = async () => {
    console.log('[PaperSearch] handleSearch called');
    
    if (!searchQuery.keywords && !searchQuery.field && !searchQuery.researchGoal && !searchQuery.methodHints) {
      setError("请输入关键词或选择研究领域");
      return;
    }

    if (selectedSources.length === 0) {
      setError("请至少选择一个检索 API");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[PaperSearch] Sending request to /api/paper-search');
      const response = await fetch("/api/paper-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...searchQuery,
          sources: selectedSources,
          apiKeys: {
            "semantic-scholar": apiConfig["semantic-scholar"],
          },
        }),
      });
      
      console.log('[PaperSearch] Response status:', response.status);
      
      const data = await response.json();
      console.log('[PaperSearch] Response data:', data);
      
      if (data.success) {
        setResults(data.data);
        setSelectedPaperIds(new Set());
      } else {
        setError(data.error || "搜索失败");
      }
    } catch (err) {
      console.error('[PaperSearch] Error:', err);
      setError("网络错误，请重试: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (paper: PaperResult) => {
    if (importingIds.has(paper.id)) return;
    
    setImportingIds((prev) => new Set([...prev, paper.id]));

    try {
      const arxivId = paper.source === "arxiv" ? paper.id : undefined;
      // 去重：已在本地库则跳过
      if (arxivId && (await repository.arxivExists(arxivId))) {
        setImportedIds((prev) => new Set([...prev, paper.id]));
        return;
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
    } catch (err) {
      console.error("Import error:", err);
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
    for (const paper of selectedPapers) {
      await handleImport(paper);
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
      .map((paper) => ({
        title: paper.title,
        url: paper.pdfUrl,
        sourceUrl: paper.url,
      }));
    localStorage.setItem("paperSearchMarkdownQueue", JSON.stringify(payload));
    window.open("/tools/markdown-convert?from=paper-search", "_blank");
  };

  const handleExport = () => {
    const markdown = generateMarkdown(results);
    downloadFile(markdown, "paper-search-results.md");
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

  const handleAnalyze = async (paper: PaperResult) => {
    if (analyzingIds.has(paper.id)) return;
    
    setAnalyzingIds((prev) => new Set([...prev, paper.id]));
    
    try {
      console.log('[PaperSearch] Analyzing paper:', paper.title);
      
      const response = await fetch("/api/analyze-paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: paper.title,
          abstract: paper.abstract,
          authors: paper.authors.join(", "),
        }),
      });
      
      console.log('[PaperSearch] Analysis response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[PaperSearch] Analysis response data:', data);
      
      if (data.success) {
        setAnalysisResults((prev) => ({ ...prev, [paper.id]: data.data }));
        setExpandedPaperId(paper.id);
      } else {
        console.error('[PaperSearch] Analysis failed:', data.error);
        alert(`分析失败: ${data.error || '未知错误'}`);
      }
    } catch (err) {
      console.error('[PaperSearch] Analysis error:', err);
      const errorMsg = err instanceof Error ? err.message : '未知错误';
      alert(`分析失败: ${errorMsg}`);
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
      prev.includes(sourceId)
        ? prev.filter((s) => s !== sourceId)
        : [...prev, sourceId]
    );
  };

  const handleCopyLink = async (paperId: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedIds((prev) => new Set([...prev, paperId]));
      setTimeout(() => {
        setCopiedIds((prev) => {
          const next = new Set(prev);
          next.delete(paperId);
          return next;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <ToolShell tool={TOOL}>
      {showSettings && (
        <div className="surface rounded-[20px] p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-ink">API 设置</h3>
            <button
              onClick={() => setShowSettings(false)}
              className="p-1.5 rounded-lg hover:bg-paper-2/80 transition-colors"
            >
              <X className="w-5 h-5 text-ink-2" />
            </button>
          </div>
          
          <div className="space-y-3 mb-6">
            {SEARCH_SOURCES.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between p-4 rounded-xl bg-paper-2/60"
              >
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedSources.includes(source.id)}
                    onChange={() => toggleSource(source.id)}
                    className="w-4 h-4 rounded border-line text-plum focus:ring-plum"
                  />
                  <div>
                    <div className="font-medium text-ink">{source.name}</div>
                    <div className="text-xs text-ink-3">{source.description}</div>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-paper-2/80 text-ink-2">
                  {source.coverage}
                </span>
              </div>
            ))}
          </div>

          {selectedSources.includes("semantic-scholar") && (
            <div className="mb-6">
              <label className="overline block mb-2">Semantic Scholar API Key</label>
              <input
                type="text"
                value={apiConfig["semantic-scholar"] || ""}
                onChange={(e) =>
                  setApiConfig((prev) => ({ ...prev, "semantic-scholar": e.target.value }))
                }
                placeholder="输入您的 API Key（可选）"
                className={cn(
                  "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
                  "text-[14px] text-ink placeholder:text-ink-4 font-mono",
                  "outline-none transition-colors focus:border-line-strong",
                )}
              />
              <p className="text-xs text-ink-3 mt-2">
                免费申请地址: https://www.semanticscholar.org/product/api
              </p>
            </div>
          )}

          {selectedSources.includes("ieee") && (
            <div className="mb-6">
              <label className="overline block mb-2">IEEE Xplore API Key</label>
              <input
                type="text"
                value={apiConfig["ieee"] || ""}
                onChange={(e) =>
                  setApiConfig((prev) => ({ ...prev, "ieee": e.target.value }))
                }
                placeholder="输入您的 IEEE API Key"
                className={cn(
                  "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
                  "text-[14px] text-ink placeholder:text-ink-4 font-mono",
                  "outline-none transition-colors focus:border-line-strong",
                )}
              />
              <p className="text-xs text-ink-3 mt-2">
                申请地址: https://developer.ieee.org/
              </p>
            </div>
          )}

          {selectedSources.includes("scopus") && (
            <div className="mb-6">
              <label className="overline block mb-2">Scopus API Key</label>
              <input
                type="text"
                value={apiConfig["scopus"] || ""}
                onChange={(e) =>
                  setApiConfig((prev) => ({ ...prev, "scopus": e.target.value }))
                }
                placeholder="输入您的 Scopus API Key"
                className={cn(
                  "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
                  "text-[14px] text-ink placeholder:text-ink-4 font-mono",
                  "outline-none transition-colors focus:border-line-strong",
                )}
              />
              <p className="text-xs text-ink-3 mt-2">
                申请地址: https://dev.elsevier.com/
              </p>
            </div>
          )}

          {selectedSources.includes("acm") && (
            <div className="mb-6">
              <label className="overline block mb-2">ACM Digital Library API Key</label>
              <input
                type="text"
                value={apiConfig["acm"] || ""}
                onChange={(e) =>
                  setApiConfig((prev) => ({ ...prev, "acm": e.target.value }))
                }
                placeholder="输入您的 ACM API Key"
                className={cn(
                  "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
                  "text-[14px] text-ink placeholder:text-ink-4 font-mono",
                  "outline-none transition-colors focus:border-line-strong",
                )}
              />
              <p className="text-xs text-ink-3 mt-2">
                申请地址: https://dl.acm.org/developers
              </p>
            </div>
          )}

          {selectedSources.includes("webofscience") && (
            <div className="mb-6">
              <label className="overline block mb-2">Web of Science API Key</label>
              <input
                type="text"
                value={apiConfig["webofscience"] || ""}
                onChange={(e) =>
                  setApiConfig((prev) => ({ ...prev, "webofscience": e.target.value }))
                }
                placeholder="输入您的 Web of Science API Key"
                className={cn(
                  "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
                  "text-[14px] text-ink placeholder:text-ink-4 font-mono",
                  "outline-none transition-colors focus:border-line-strong",
                )}
              />
              <p className="text-xs text-ink-3 mt-2">
                申请地址: https://developer.clarivate.com/
              </p>
            </div>
          )}

          <button
            onClick={saveConfig}
            className="cta-gradient w-full rounded-full px-5 py-3 text-[14px] font-medium transition-all"
          >
            保存设置
          </button>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <div className="surface rounded-[20px] p-6">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="mb-4 flex items-center gap-2 text-sm text-ink-2 hover:text-ink transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="serif-italic">API 设置</span>
            </button>

            <div className="space-y-6">
              <div>
                <label className="overline block mb-2">检索 API</label>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-ink-3">
                    {searchQuery.field ? (
                      `已筛选 ${RESEARCH_FIELDS.find(f => f.id === searchQuery.field)?.label} 领域相关 API`
                    ) : (
                      '显示所有 API'
                    )}
                  </span>
                  {searchQuery.field && (
                    <button
                      onClick={() => setSearchQuery((prev) => ({ ...prev, field: "", subField: "" }))}
                      className="text-xs text-plum hover:text-plum/80 transition-colors"
                    >
                      清除筛选
                    </button>
                  )}
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  {SEARCH_SOURCES
                    .filter((source) => !searchQuery.field || source.fields.includes(searchQuery.field))
                    .map((source) => {
                      const active = selectedSources.includes(source.id);
                      return (
                        <button
                          key={source.id}
                          onClick={() => toggleSource(source.id)}
                          className={cn(
                            "rounded-xl border px-3 py-3 text-left transition-all",
                            active
                              ? "border-plum bg-plum/10 text-ink"
                              : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{source.name}</span>
                            {active ? <CheckSquare className="w-4 h-4 text-plum" /> : <Square className="w-4 h-4 text-ink-4" />}
                          </div>
                          <p className="mt-1 text-[11px] text-ink-3 leading-relaxed">{source.coverage}</p>
                        </button>
                      );
                    })}
                </div>
              </div>

              <div>
                <label className="overline block mb-2">研究领域</label>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="relative">
                    <select
                      value={searchQuery.field}
                      onChange={(e) =>
                        setSearchQuery((prev) => ({ ...prev, field: e.target.value, subField: "", venues: [] }))
                      }
                      className={cn(
                        "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
                        "text-[14px] text-ink appearance-none cursor-pointer",
                        "outline-none transition-colors focus:border-line-strong",
                      )}
                    >
                      <option value="">选择大领域...</option>
                      {RESEARCH_FIELDS.map((field) => (
                        <option key={field.id} value={field.id}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-4 pointer-events-none" />
                  </div>
                  
                  <div className="relative">
                    <select
                      value={searchQuery.subField}
                      onChange={(e) => {
                        const subFieldId = e.target.value;
                        const subField = searchQuery.field 
                          ? RESEARCH_FIELDS.find(f => f.id === searchQuery.field)?.subFields.find(s => s.id === subFieldId)
                          : null;
                        
                        setSearchQuery((prev) => ({ 
                          ...prev, 
                          subField: subFieldId,
                          keywords: subField ? `${subField.keywords} ${prev.keywords}`.trim() : prev.keywords
                        }));
                      }}
                      disabled={!searchQuery.field}
                      className={cn(
                        "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
                        "text-[14px] text-ink appearance-none cursor-pointer",
                        "outline-none transition-colors focus:border-line-strong",
                        !searchQuery.field && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <option value="">
                        {!searchQuery.field ? "请先选择大领域" : "选择细化方向..."}
                      </option>
                      {searchQuery.field && RESEARCH_FIELDS.find(f => f.id === searchQuery.field)?.subFields.map((subField) => (
                        <option key={subField.id} value={subField.id}>
                          {subField.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-4 pointer-events-none" />
                  </div>
                </div>
                
                {(searchQuery.field || searchQuery.subField) && (
                  <p className="text-xs text-ink-3 mt-2">
                    {searchQuery.subField 
                      ? `已选择: ${RESEARCH_FIELDS.find(f => f.id === searchQuery.field)?.label} → ${RESEARCH_FIELDS.find(f => f.id === searchQuery.field)?.subFields.find(s => s.id === searchQuery.subField)?.label}`
                      : `已选择大领域: ${RESEARCH_FIELDS.find(f => f.id === searchQuery.field)?.label}`
                    }
                  </p>
                )}
              </div>

              <div>
                <label className="overline block mb-2">自定义关键词</label>
                <input
                  type="text"
                  value={searchQuery.keywords}
                  onChange={(e) =>
                    setSearchQuery((prev) => ({ ...prev, keywords: e.target.value }))
                  }
                  placeholder="输入关键词或短语（支持中英文混合）"
                  className={cn(
                    "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
                    "text-[14px] text-ink placeholder:text-ink-4",
                    "outline-none transition-colors focus:border-line-strong",
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="overline block mb-2">研究目标</label>
                  <textarea
                    value={searchQuery.researchGoal || ""}
                    onChange={(e) =>
                      setSearchQuery((prev) => ({ ...prev, researchGoal: e.target.value }))
                    }
                    placeholder="例如：想找能用于医学图像小样本分割的轻量模型"
                    rows={3}
                    className={cn(
                      "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
                      "text-[14px] text-ink placeholder:text-ink-4 resize-none",
                      "outline-none transition-colors focus:border-line-strong",
                    )}
                  />
                </div>
                <div>
                  <label className="overline block mb-2">方法/数据线索</label>
                  <textarea
                    value={searchQuery.methodHints || ""}
                    onChange={(e) =>
                      setSearchQuery((prev) => ({ ...prev, methodHints: e.target.value }))
                    }
                    placeholder="例如：Mamba, UNet, 3D MRI, ISIC, BraTS"
                    rows={3}
                    className={cn(
                      "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
                      "text-[14px] text-ink placeholder:text-ink-4 resize-none",
                      "outline-none transition-colors focus:border-line-strong",
                    )}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="overline block mb-2">必含词</label>
                  <input
                    type="text"
                    value={searchQuery.mustHaveKeywords || ""}
                    onChange={(e) =>
                      setSearchQuery((prev) => ({ ...prev, mustHaveKeywords: e.target.value }))
                    }
                    placeholder="用逗号分隔，如 segmentation, transformer"
                    className={cn(
                      "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
                      "text-[14px] text-ink placeholder:text-ink-4",
                      "outline-none transition-colors focus:border-line-strong",
                    )}
                  />
                </div>
                <div>
                  <label className="overline block mb-2">排除词</label>
                  <input
                    type="text"
                    value={searchQuery.excludeKeywords || ""}
                    onChange={(e) =>
                      setSearchQuery((prev) => ({ ...prev, excludeKeywords: e.target.value }))
                    }
                    placeholder="用逗号分隔，如 survey, tutorial"
                    className={cn(
                      "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
                      "text-[14px] text-ink placeholder:text-ink-4",
                      "outline-none transition-colors focus:border-line-strong",
                    )}
                  />
                </div>
              </div>

              <div>
                <label className="overline block mb-2">时间范围</label>
                <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_1fr]">
                  <input
                    type="number"
                    value={searchQuery.startYear}
                    onChange={(e) =>
                      setSearchQuery((prev) => ({
                        ...prev,
                        startYear: parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder="起始年份"
                    className={cn(
                      "focus-ring flex-1 rounded-xl bg-paper-2/80 border border-line px-4 py-3",
                      "text-[14px] text-ink placeholder:text-ink-4",
                      "outline-none transition-colors focus:border-line-strong",
                    )}
                  />
                  <span className="flex items-center text-ink-4">-</span>
                  <input
                    type="number"
                    value={searchQuery.endYear}
                    onChange={(e) =>
                      setSearchQuery((prev) => ({
                        ...prev,
                        endYear: parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder="结束年份"
                    className={cn(
                      "focus-ring flex-1 rounded-xl bg-paper-2/80 border border-line px-4 py-3",
                      "text-[14px] text-ink placeholder:text-ink-4",
                      "outline-none transition-colors focus:border-line-strong",
                    )}
                  />
                  <select
                    value={searchQuery.sortBy || "relevance"}
                    onChange={(e) =>
                      setSearchQuery((prev) => ({
                        ...prev,
                        sortBy: e.target.value as SearchQuery["sortBy"],
                      }))
                    }
                    className={cn(
                      "focus-ring rounded-xl bg-paper-2/80 border border-line px-4 py-3",
                      "text-[14px] text-ink appearance-none cursor-pointer",
                      "outline-none transition-colors focus:border-line-strong",
                    )}
                  >
                    <option value="relevance">综合排序</option>
                    <option value="citations">引用优先</option>
                    <option value="year">最新优先</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="overline block mb-2">会议/期刊筛选</label>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-ink-3">
                    {searchQuery.field 
                      ? `已显示 ${RESEARCH_FIELDS.find(f => f.id === searchQuery.field)?.label} 领域权威来源` 
                      : '显示所有领域来源'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                  {getVenuesForField(searchQuery.field || null).map((venue, i) => (
                    <button
                      key={`${venue}-${i}`}
                      onClick={() => toggleVenue(venue)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-sm transition-all whitespace-nowrap",
                        (searchQuery.venues || []).includes(venue)
                          ? "border-plum bg-plum/10 text-plum"
                          : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                      )}
                    >
                      {venue}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-ink-3 mt-2">
                  点击选择会议/期刊进行精准筛选（可多选）
                </p>
              </div>

              <button
                onClick={handleSearch}
                disabled={isLoading || selectedSources.length === 0 || (!searchQuery.keywords && !searchQuery.field)}
                className={cn(
                  "cta-gradient w-full rounded-full px-5 py-3 text-[14px] font-medium",
                  "transition-all focus-ring",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                )}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    搜索中...
                  </span>
                ) : (
                  "开始搜索"
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="surface rounded-[20px] min-h-[500px] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-block h-1.5 w-1.5 rounded-full",
                  isLoading
                    ? "bg-plum animate-pulse"
                    : results.length
                      ? "bg-[var(--sage)]"
                      : "bg-ink-4",
                )}
              />
              <span className="overline">
                {isLoading ? "搜索中" : results.length ? `${results.length} 篇论文` : "空闲"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {results.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] text-ink-2",
                    "hover:text-ink hover:bg-[rgba(26,23,19,0.04)] transition-colors",
                  )}
                >
                  {selectedPaperIds.size === results.length ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  <span className="serif-italic">{selectedPaperIds.size ? `已选 ${selectedPaperIds.size}` : "全选"}</span>
                </button>
              )}
              <button
                onClick={handleBatchImport}
                disabled={selectedPapers.length === 0}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] text-plum",
                  "hover:bg-plum/10 transition-colors",
                  "disabled:opacity-40 disabled:pointer-events-none",
                )}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="serif-italic">批量入库</span>
              </button>
              <button
                onClick={openMarkdownConverter}
                disabled={selectedPapers.filter((paper) => paper.pdfUrl).length === 0}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] text-ink-2",
                  "hover:text-ink hover:bg-[rgba(26,23,19,0.04)] transition-colors",
                  "disabled:opacity-40 disabled:pointer-events-none",
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="serif-italic">批量整理</span>
              </button>
              <button
                onClick={handleExport}
                disabled={!results.length}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] text-ink-2",
                  "hover:text-ink hover:bg-[rgba(26,23,19,0.04)] transition-colors",
                  "disabled:opacity-40 disabled:pointer-events-none",
                )}
              >
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
                  <div
                    key={paper.id}
                    className={cn(
                      "rounded-xl border bg-paper-2/60 p-4 transition-colors",
                      selectedPaperIds.has(paper.id)
                        ? "border-plum/60 shadow-[0_0_0_1px_rgba(177,75,255,0.12)]"
                        : "border-line hover:border-line-strong",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => togglePaperSelection(paper.id)}
                        className="mt-1 rounded-lg p-1 text-ink-3 hover:text-plum hover:bg-plum/10 transition-colors"
                        title="选择论文"
                      >
                        {selectedPaperIds.has(paper.id) ? <CheckSquare className="w-4 h-4 text-plum" /> : <Square className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-paper-2/80 text-ink-3">
                            {paper.source === "arxiv" ? "arXiv" : paper.source === "openalex" ? "OpenAlex" : "Semantic Scholar"}
                          </span>
                          {paper.year && (
                            <span className="text-xs text-ink-3">{paper.year}</span>
                          )}
                          {paper.venue && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                              {paper.venue}
                            </span>
                          )}
                          {paper.citations && (
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
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 bg-paper-2/80 rounded-lg px-2 py-1 border border-line">
                                <span className="text-[10px] text-ink-4 truncate flex-1">
                                  {paper.url}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleCopyLink(paper.id, paper.url);
                                  }}
                                  className="flex-shrink-0 p-1 hover:bg-paper-2 rounded-md transition-colors"
                                  title="复制链接"
                                >
                                  {copiedIds.has(paper.id) ? (
                                    <Check className="w-3.5 h-3.5 text-green-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5 text-ink-4 hover:text-ink-2" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                          {paper.pdfUrl && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 bg-blue-500/10 rounded-lg px-2 py-1 border border-blue-500/20">
                                  <span className="text-[10px] text-blue-400 truncate flex-1">
                                    {paper.pdfUrl}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      paper.pdfUrl && handleCopyLink(paper.id + '-pdf', paper.pdfUrl);
                                    }}
                                    className="flex-shrink-0 p-1 hover:bg-blue-500/10 rounded-md transition-colors"
                                    title="复制PDF链接"
                                  >
                                    {copiedIds.has(paper.id + '-pdf') ? (
                                      <Check className="w-3.5 h-3.5 text-green-500" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5 text-blue-400 hover:text-blue-300" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-ink-3 truncate mt-1">
                          {paper.authors.join(", ")}
                        </p>

                        {paper.abstract && (
                          <p className="text-xs text-ink-2 line-clamp-3 mt-2 leading-relaxed">
                            {paper.abstract}
                          </p>
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
                          onClick={() => handleAnalyze(paper)}
                          disabled={analyzingIds.has(paper.id)}
                          className={cn(
                            "inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[12px] transition-colors",
                            analyzingIds.has(paper.id)
                              ? "bg-paper-2/80 text-ink-3 cursor-not-allowed"
                              : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20",
                          )}
                        >
                          {analyzingIds.has(paper.id) ? (
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
                          onClick={() => openSummarizer(paper)}
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 text-[12px] transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          速读
                        </button>

                        <button
                          onClick={() => handleImport(paper)}
                          disabled={importingIds.has(paper.id) || importedIds.has(paper.id)}
                          className={cn(
                            "inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[12px] transition-colors",
                            importingIds.has(paper.id)
                              ? "bg-paper-2/80 text-ink-3 cursor-not-allowed"
                              : importedIds.has(paper.id)
                                ? "bg-[var(--sage)]/10 text-[var(--sage)] cursor-default"
                              : "bg-plum/10 text-plum hover:bg-plum/20",
                          )}
                        >
                          {importingIds.has(paper.id) ? (
                            <span className="flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              导入中
                            </span>
                          ) : importedIds.has(paper.id) ? (
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

                    {analysisResults[paper.id] && (
                      <div className="mt-4 pt-4 border-t border-line">
                        <button
                          onClick={() => setExpandedPaperId(expandedPaperId === paper.id ? null : paper.id)}
                          className="flex items-center gap-2 text-sm text-ink-2 hover:text-ink mb-3 transition-colors"
                        >
                          <ChevronRight className={`w-4 h-4 transition-transform ${expandedPaperId === paper.id ? 'rotate-90' : ''}`} />
                          <span className="serif-italic">AI 分析结果</span>
                        </button>
                        {expandedPaperId === paper.id && (
                          <div className="bg-paper-2/40 rounded-xl p-4 text-sm text-ink-2 whitespace-pre-line">
                            {analysisResults[paper.id]}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
