"use client";

import { useRef, useState } from "react";
import {
  Search, Settings2, ChevronDown, Loader2, SlidersHorizontal, CornerDownLeft,
} from "lucide-react";
import {
  RESEARCH_FIELDS, getVenuesForField, type SearchQuery,
} from "@/lib/paper-search/types";
import { cn } from "@/lib/utils";

/**
 * 真正接入了后端聚合的检索源（lib/paper-search/search-service.ts）。
 * 注意：types.ts 里的 SEARCH_SOURCES 还列了 IEEE / Scopus 等未实现的源，
 * 这里只展示可用的，避免「点了没反应」的假选项。
 */
// 顺序 = 综合排序里的「可打开优先」：arXiv 主源在前，OpenAlex/Crossref（常只有 DOI 落地页）靠后。
const LIVE_SOURCES = [
  { id: "arxiv", name: "arXiv", dot: "var(--coral)", hint: "预印本 · 更新最快 · 可直接在论文库阅读" },
  { id: "semantic-scholar", name: "S2", fullName: "Semantic Scholar", dot: "var(--ocean)", hint: "全学科 · 多带可读直链 · 无 key 偶限流" },
  { id: "openalex", name: "OpenAlex", dot: "var(--ocean)", hint: "2.5 亿学术作品 · 全学科 · 多为 DOI 落地页" },
  { id: "crossref", name: "Crossref", dot: "var(--plum)", hint: "1.5 亿 DOI · 正式出版" },
  { id: "europepmc", name: "Europe PMC", dot: "var(--sage)", hint: "生物医学 · 含 bioRxiv/medRxiv 预印本" },
] as const;

/** 快速方向包：一键填充关键词并立即检索。 */
const QUICK_PACKS: Array<{ label: string; kw: string }> = [
  { label: "🩻 医学图像分割", kw: "medical image segmentation" },
  { label: "🐍 Mamba / SSM", kw: "mamba state space model" },
  { label: "🌫️ 扩散模型", kw: "diffusion model image generation" },
  { label: "🧠 大语言模型", kw: "large language model" },
  { label: "👁️ 多模态", kw: "multimodal vision language model" },
  { label: "🎮 强化学习", kw: "reinforcement learning" },
  { label: "🕸️ 图神经网络", kw: "graph neural network" },
  { label: "⚡ 模型压缩", kw: "model compression quantization pruning" },
];

const fieldInput = cn(
  "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-3.5 py-2.5",
  "text-[13.5px] text-ink placeholder:text-ink-4",
  "outline-none transition-colors focus:border-line-strong",
);

const fieldSelect = cn(fieldInput, "appearance-none cursor-pointer pr-9");

function SelectShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
    </div>
  );
}

/**
 * 检索台 —— 主搜索框（回车即检索）+ 检索源 pills + 可折叠高级筛选。
 * 高级筛选：领域/细分方向、排序与数量、年份、必含/排除词、研究目标与方法线索、会议筛选。
 */
export function SearchForm({
  searchQuery,
  setSearchQuery,
  selectedSources,
  toggleSource,
  toggleVenue,
  llmRerank,
  setLlmRerank,
  isLoading,
  onSearch,
  onSearchWith,
  onOpenSettings,
}: {
  searchQuery: SearchQuery;
  setSearchQuery: React.Dispatch<React.SetStateAction<SearchQuery>>;
  selectedSources: string[];
  toggleSource: (id: string) => void;
  toggleVenue: (venue: string) => void;
  llmRerank: boolean;
  setLlmRerank: (v: boolean) => void;
  isLoading: boolean;
  onSearch: () => void;
  /** 用给定关键词覆盖输入框并立即检索（快速方向包 / 热门 / 最近检索用） */
  onSearchWith: (keywords: string) => void;
  onOpenSettings: () => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentField = RESEARCH_FIELDS.find((f) => f.id === searchQuery.field);

  const advancedActiveCount =
    (searchQuery.field ? 1 : 0) +
    (searchQuery.venues?.length ? 1 : 0) +
    (searchQuery.mustHaveKeywords?.trim() ? 1 : 0) +
    (searchQuery.excludeKeywords?.trim() ? 1 : 0) +
    (searchQuery.researchGoal?.trim() ? 1 : 0) +
    (searchQuery.methodHints?.trim() ? 1 : 0);

  return (
    <div className="surface-strong overflow-hidden rounded-[24px]">
      {/* ── 主搜索行 ─────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
        <Search className="h-5 w-5 shrink-0 text-ink-3" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery.keywords}
          onChange={(e) => setSearchQuery((prev) => ({ ...prev, keywords: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isLoading) onSearch();
          }}
          placeholder="关键词、方法名或数据集 — 例如 mamba medical segmentation"
          className="min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-4 sm:text-[17px]"
        />
        <span className="hidden items-center gap-1 text-[11px] text-ink-4 md:flex">
          <CornerDownLeft className="h-3 w-3" />
          回车
        </span>
        <button
          onClick={onSearch}
          disabled={isLoading || selectedSources.length === 0}
          className="cta-gradient focus-ring shrink-0 rounded-full px-5 py-2 text-[13.5px] font-medium sm:px-6"
        >
          {isLoading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              检索中
            </span>
          ) : (
            "检索"
          )}
        </button>
      </div>

      <div className="hairline" />

      {/* ── 检索源 + 高级筛选开关 ────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-paper-2/40 px-5 py-2.5 sm:px-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="overline mr-1 text-[10px]">检索源</span>
          {LIVE_SOURCES.map((s) => {
            const active = selectedSources.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggleSource(s.id)}
                title={`${"fullName" in s ? s.fullName : s.name} · ${s.hint}`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-all",
                  active
                    ? "border-line-strong bg-paper text-ink"
                    : "border-transparent text-ink-4 hover:text-ink-2",
                )}
              >
                <span
                  className={cn("h-1.5 w-1.5 rounded-full transition-opacity", !active && "opacity-25")}
                  style={{ background: s.dot }}
                />
                {s.name}
              </button>
            );
          })}
          <button
            onClick={onOpenSettings}
            className="ml-0.5 rounded-full p-1.5 text-ink-4 transition-colors hover:bg-paper-3 hover:text-ink-2"
            title="API Key 设置"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>

          {/* 最新论文通道：一键把检索切到「近一年 + 最新优先」，专抓新论文/预印本 */}
          {(() => {
            const thisYear = new Date().getFullYear();
            const latestOn = searchQuery.startYear === thisYear - 1 && searchQuery.sortBy === "year";
            return (
              <button
                onClick={() =>
                  setSearchQuery((prev) =>
                    latestOn
                      ? { ...prev, startYear: thisYear - 2, sortBy: "relevance" }
                      : { ...prev, startYear: thisYear - 1, endYear: thisYear, sortBy: "year" },
                  )
                }
                title="只看近一年、按最新排序——专抓新论文与预印本"
                className={cn(
                  "ml-1 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] transition-all",
                  latestOn
                    ? "border-coral/50 bg-coral/10 text-coral"
                    : "border-transparent text-ink-4 hover:text-ink-2",
                )}
              >
                🆕 近一年
              </button>
            );
          })()}

          {/* LLM 精排：默认关，开启后对相关性模式前 20 篇按与研究目标契合度重排（需 AI key） */}
          <button
            onClick={() => setLlmRerank(!llmRerank)}
            title="对相关性排序的前 20 篇用 LLM 按与研究目标的契合度精排（多一次 AI 调用，需 API key）"
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] transition-all",
              llmRerank
                ? "border-sage/50 bg-sage/10 text-sage"
                : "border-transparent text-ink-4 hover:text-ink-2",
            )}
          >
            ✨ AI 精排
          </button>
        </div>

        <button
          onClick={() => setAdvancedOpen((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] transition-colors",
            advancedOpen || advancedActiveCount > 0
              ? "text-plum hover:bg-plum/10"
              : "text-ink-3 hover:bg-paper-3 hover:text-ink",
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          高级筛选
          {advancedActiveCount > 0 && (
            <span className="mono rounded-full bg-plum/15 px-1.5 text-[10px] text-plum">
              {advancedActiveCount}
            </span>
          )}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", advancedOpen && "rotate-180")} />
        </button>
      </div>

      {/* ── 快速方向包 ──────────────────────────────── */}
      {!advancedOpen && (
        <div className="flex flex-wrap items-center gap-1.5 px-5 pb-4 pt-3 sm:px-6">
          {QUICK_PACKS.map((p) => (
            <button
              key={p.kw}
              onClick={() => onSearchWith(p.kw)}
              disabled={isLoading}
              className="rounded-full border border-line bg-[rgba(26,23,19,0.02)] px-3 py-1 text-[12px] text-ink-2 transition-colors hover:border-plum/40 hover:text-ink disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* ── 高级筛选 ────────────────────────────────── */}
      {advancedOpen && (
        <div className="space-y-5 border-t border-line px-5 py-5 sm:px-6">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="overline mb-1.5 block text-[10px]">研究领域</label>
              <SelectShell>
                <select
                  value={searchQuery.field}
                  onChange={(e) =>
                    setSearchQuery((prev) => ({ ...prev, field: e.target.value, subField: "", venues: [] }))
                  }
                  className={fieldSelect}
                >
                  <option value="">不限领域</option>
                  {RESEARCH_FIELDS.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </SelectShell>
            </div>
            <div>
              <label className="overline mb-1.5 block text-[10px]">细分方向</label>
              <SelectShell>
                <select
                  value={searchQuery.subField}
                  onChange={(e) => {
                    const subField = currentField?.subFields.find((s) => s.id === e.target.value);
                    setSearchQuery((prev) => ({
                      ...prev,
                      subField: e.target.value,
                      keywords: subField ? `${subField.keywords} ${prev.keywords}`.trim() : prev.keywords,
                    }));
                  }}
                  disabled={!searchQuery.field}
                  className={cn(fieldSelect, !searchQuery.field && "cursor-not-allowed opacity-50")}
                >
                  <option value="">{searchQuery.field ? "选择方向（填充关键词）" : "先选领域"}</option>
                  {currentField?.subFields.map((subField) => (
                    <option key={subField.id} value={subField.id}>
                      {subField.label}
                    </option>
                  ))}
                </select>
              </SelectShell>
            </div>
            <div>
              <label className="overline mb-1.5 block text-[10px]">排序</label>
              <SelectShell>
                <select
                  value={searchQuery.sortBy || "relevance"}
                  onChange={(e) =>
                    setSearchQuery((prev) => ({ ...prev, sortBy: e.target.value as SearchQuery["sortBy"] }))
                  }
                  className={fieldSelect}
                >
                  <option value="relevance">综合排序</option>
                  <option value="citations">被引优先</option>
                  <option value="year">最新优先</option>
                </select>
              </SelectShell>
            </div>
            <div>
              <label className="overline mb-1.5 block text-[10px]">结果数量</label>
              <SelectShell>
                <select
                  value={searchQuery.maxResults || 30}
                  onChange={(e) =>
                    setSearchQuery((prev) => ({ ...prev, maxResults: Number(e.target.value) }))
                  }
                  className={fieldSelect}
                >
                  <option value={30}>30 篇</option>
                  <option value={50}>50 篇</option>
                  <option value={100}>100 篇</option>
                </select>
              </SelectShell>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_1.5fr_1.5fr]">
            <div>
              <label className="overline mb-1.5 block text-[10px]">起始年份</label>
              <input
                type="number"
                value={searchQuery.startYear || ""}
                onChange={(e) => setSearchQuery((prev) => ({ ...prev, startYear: parseInt(e.target.value) || 0 }))}
                placeholder="2022"
                className={fieldInput}
              />
            </div>
            <span className="hidden items-end pb-3 text-ink-4 md:flex">—</span>
            <div>
              <label className="overline mb-1.5 block text-[10px]">结束年份</label>
              <input
                type="number"
                value={searchQuery.endYear || ""}
                onChange={(e) => setSearchQuery((prev) => ({ ...prev, endYear: parseInt(e.target.value) || 0 }))}
                placeholder={String(new Date().getFullYear())}
                className={fieldInput}
              />
            </div>
            <div>
              <label className="overline mb-1.5 block text-[10px]">必含词（逗号分隔）</label>
              <input
                type="text"
                value={searchQuery.mustHaveKeywords || ""}
                onChange={(e) => setSearchQuery((prev) => ({ ...prev, mustHaveKeywords: e.target.value }))}
                placeholder="segmentation, transformer"
                className={fieldInput}
              />
            </div>
            <div>
              <label className="overline mb-1.5 block text-[10px]">排除词（逗号分隔）</label>
              <input
                type="text"
                value={searchQuery.excludeKeywords || ""}
                onChange={(e) => setSearchQuery((prev) => ({ ...prev, excludeKeywords: e.target.value }))}
                placeholder="survey, tutorial"
                className={fieldInput}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="overline mb-1.5 block text-[10px]">研究目标（拼进检索词）</label>
              <textarea
                value={searchQuery.researchGoal || ""}
                onChange={(e) => setSearchQuery((prev) => ({ ...prev, researchGoal: e.target.value }))}
                placeholder="例如：想找能用于医学图像小样本分割的轻量模型"
                rows={2}
                className={cn(fieldInput, "resize-none")}
              />
            </div>
            <div>
              <label className="overline mb-1.5 block text-[10px]">方法 / 数据线索</label>
              <textarea
                value={searchQuery.methodHints || ""}
                onChange={(e) => setSearchQuery((prev) => ({ ...prev, methodHints: e.target.value }))}
                placeholder="例如：Mamba, UNet, 3D MRI, ISIC, BraTS"
                rows={2}
                className={cn(fieldInput, "resize-none")}
              />
            </div>
          </div>

          <div>
            <label className="overline mb-1.5 block text-[10px]">
              会议 / 期刊{searchQuery.field ? `（${currentField?.label}）` : ""}
              {(searchQuery.venues?.length ?? 0) > 0 && (
                <span className="ml-2 text-plum">已选 {searchQuery.venues!.length}</span>
              )}
            </label>
            <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto p-0.5">
              {getVenuesForField(searchQuery.field || null).map((venue, i) => (
                <button
                  key={`${venue}-${i}`}
                  onClick={() => toggleVenue(venue)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[12px] whitespace-nowrap transition-all",
                    (searchQuery.venues || []).includes(venue)
                      ? "border-plum bg-plum/10 text-plum"
                      : "border-line bg-paper-2/60 text-ink-3 hover:border-line-strong hover:text-ink",
                  )}
                >
                  {venue}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
