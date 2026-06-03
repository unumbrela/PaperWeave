"use client";

import { Settings, ChevronDown, Loader2, CheckSquare, Square } from "lucide-react";
import {
  RESEARCH_FIELDS, SEARCH_SOURCES, getVenuesForField, type SearchQuery,
} from "@/lib/paper-search/types";
import { cn } from "@/lib/utils";

const inputCls = cn(
  "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
  "text-[14px] text-ink placeholder:text-ink-4",
  "outline-none transition-colors focus:border-line-strong",
);

const selectCls = cn(
  "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
  "text-[14px] text-ink appearance-none cursor-pointer",
  "outline-none transition-colors focus:border-line-strong",
);

/** 检索条件表单：检索源、研究领域、关键词、目标/线索、时间范围、会议筛选。 */
export function SearchForm({
  searchQuery,
  setSearchQuery,
  selectedSources,
  toggleSource,
  toggleVenue,
  isLoading,
  onSearch,
  onOpenSettings,
}: {
  searchQuery: SearchQuery;
  setSearchQuery: React.Dispatch<React.SetStateAction<SearchQuery>>;
  selectedSources: string[];
  toggleSource: (id: string) => void;
  toggleVenue: (venue: string) => void;
  isLoading: boolean;
  onSearch: () => void;
  onOpenSettings: () => void;
}) {
  const currentField = RESEARCH_FIELDS.find((f) => f.id === searchQuery.field);

  return (
    <div className="surface rounded-[20px] p-6">
      <button
        onClick={onOpenSettings}
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
              {searchQuery.field ? `已筛选 ${currentField?.label} 领域相关 API` : "显示所有 API"}
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
            {SEARCH_SOURCES.filter((source) => !searchQuery.field || source.fields.includes(searchQuery.field)).map((source) => {
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
                className={selectCls}
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
                    ? currentField?.subFields.find((s) => s.id === subFieldId)
                    : null;
                  setSearchQuery((prev) => ({
                    ...prev,
                    subField: subFieldId,
                    keywords: subField ? `${subField.keywords} ${prev.keywords}`.trim() : prev.keywords,
                  }));
                }}
                disabled={!searchQuery.field}
                className={cn(selectCls, !searchQuery.field && "opacity-50 cursor-not-allowed")}
              >
                <option value="">{!searchQuery.field ? "请先选择大领域" : "选择细化方向..."}</option>
                {currentField?.subFields.map((subField) => (
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
                ? `已选择: ${currentField?.label} → ${currentField?.subFields.find((s) => s.id === searchQuery.subField)?.label}`
                : `已选择大领域: ${currentField?.label}`}
            </p>
          )}
        </div>

        <div>
          <label className="overline block mb-2">自定义关键词</label>
          <input
            type="text"
            value={searchQuery.keywords}
            onChange={(e) => setSearchQuery((prev) => ({ ...prev, keywords: e.target.value }))}
            placeholder="输入关键词或短语（支持中英文混合）"
            className={inputCls}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="overline block mb-2">研究目标</label>
            <textarea
              value={searchQuery.researchGoal || ""}
              onChange={(e) => setSearchQuery((prev) => ({ ...prev, researchGoal: e.target.value }))}
              placeholder="例如：想找能用于医学图像小样本分割的轻量模型"
              rows={3}
              className={cn(inputCls, "resize-none")}
            />
          </div>
          <div>
            <label className="overline block mb-2">方法/数据线索</label>
            <textarea
              value={searchQuery.methodHints || ""}
              onChange={(e) => setSearchQuery((prev) => ({ ...prev, methodHints: e.target.value }))}
              placeholder="例如：Mamba, UNet, 3D MRI, ISIC, BraTS"
              rows={3}
              className={cn(inputCls, "resize-none")}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="overline block mb-2">必含词</label>
            <input
              type="text"
              value={searchQuery.mustHaveKeywords || ""}
              onChange={(e) => setSearchQuery((prev) => ({ ...prev, mustHaveKeywords: e.target.value }))}
              placeholder="用逗号分隔，如 segmentation, transformer"
              className={inputCls}
            />
          </div>
          <div>
            <label className="overline block mb-2">排除词</label>
            <input
              type="text"
              value={searchQuery.excludeKeywords || ""}
              onChange={(e) => setSearchQuery((prev) => ({ ...prev, excludeKeywords: e.target.value }))}
              placeholder="用逗号分隔，如 survey, tutorial"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className="overline block mb-2">时间范围</label>
          <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_1fr]">
            <input
              type="number"
              value={searchQuery.startYear}
              onChange={(e) => setSearchQuery((prev) => ({ ...prev, startYear: parseInt(e.target.value) || 0 }))}
              placeholder="起始年份"
              className={cn(inputCls, "flex-1")}
            />
            <span className="flex items-center text-ink-4">-</span>
            <input
              type="number"
              value={searchQuery.endYear}
              onChange={(e) => setSearchQuery((prev) => ({ ...prev, endYear: parseInt(e.target.value) || 0 }))}
              placeholder="结束年份"
              className={cn(inputCls, "flex-1")}
            />
            <select
              value={searchQuery.sortBy || "relevance"}
              onChange={(e) => setSearchQuery((prev) => ({ ...prev, sortBy: e.target.value as SearchQuery["sortBy"] }))}
              className={selectCls}
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
              {searchQuery.field ? `已显示 ${currentField?.label} 领域权威来源` : "显示所有领域来源"}
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
          <p className="text-xs text-ink-3 mt-2">点击选择会议/期刊进行精准筛选（可多选）</p>
        </div>

        <button
          onClick={onSearch}
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
  );
}
