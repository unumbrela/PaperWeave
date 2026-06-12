"use client";

import { useMemo } from "react";
import { RotateCcw, FileDown } from "lucide-react";
import type { PaperResult } from "@/lib/paper-search/types";
import {
  facetCounts, isRefineActive, EMPTY_REFINE, type RefineState,
} from "@/lib/paper-search/refine";
import { cn } from "@/lib/utils";

const SOURCE_META: Record<string, { label: string; dot: string }> = {
  openalex: { label: "OpenAlex", dot: "var(--ocean)" },
  arxiv: { label: "arXiv", dot: "var(--coral)" },
  "semantic-scholar": { label: "Semantic Scholar", dot: "var(--sage)" },
};

const CITATION_STEPS = [0, 10, 50, 100, 500];

/** 年份直方图最多展示最近 N 年（更早的归并不显示，点击重置可清空） */
const MAX_YEAR_BARS = 12;

function toggleInList<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/**
 * 结果精炼栏 —— 在已拿到的结果上做客户端二次筛选：
 * 来源 / 年份直方图 / 引用下限 / 仅含 PDF / 高频会议。
 * 纯客户端，不重新请求；facet 计数来自全量结果。
 */
export function RefinePanel({
  results,
  refine,
  onChange,
}: {
  results: PaperResult[];
  refine: RefineState;
  onChange: (next: RefineState) => void;
}) {
  const facets = useMemo(() => facetCounts(results), [results]);
  const yearBars = facets.years.slice(-MAX_YEAR_BARS);
  const maxYearCount = Math.max(1, ...yearBars.map((y) => y.count));
  const pdfCount = useMemo(() => results.filter((p) => p.pdfUrl).length, [results]);

  if (results.length === 0) return null;

  return (
    <div className="sticky top-24 space-y-5">
      <div className="flex items-center justify-between">
        <span className="overline">结果精炼</span>
        {isRefineActive(refine) && (
          <button
            onClick={() => onChange(EMPTY_REFINE)}
            className="inline-flex items-center gap-1 text-[11px] text-plum transition-colors hover:text-plum/70"
          >
            <RotateCcw className="h-3 w-3" />
            重置
          </button>
        )}
      </div>

      {/* 来源 */}
      <section>
        <h4 className="mono mb-2 text-[10px] uppercase tracking-wider text-ink-4">来源</h4>
        <div className="space-y-1">
          {Object.entries(facets.sources).map(([id, count]) => {
            const meta = SOURCE_META[id] ?? { label: id, dot: "var(--ink-4)" };
            const active = refine.sources.includes(id);
            return (
              <button
                key={id}
                onClick={() => onChange({ ...refine, sources: toggleInList(refine.sources, id) })}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] transition-colors",
                  active ? "bg-paper text-ink shadow-sm" : "text-ink-3 hover:bg-paper-2/70 hover:text-ink",
                )}
              >
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", !active && refine.sources.length > 0 && "opacity-30")}
                  style={{ background: meta.dot }}
                />
                <span className="flex-1 truncate text-left">{meta.label}</span>
                <span className="mono text-[11px] tabular-nums text-ink-4">{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 年份直方图 */}
      {yearBars.length > 1 && (
        <section>
          <h4 className="mono mb-2 text-[10px] uppercase tracking-wider text-ink-4">年份</h4>
          <div className="flex h-14 items-end gap-[3px]">
            {yearBars.map(({ year, count }) => {
              const active = refine.years.includes(year);
              const dimmed = refine.years.length > 0 && !active;
              return (
                <button
                  key={year}
                  onClick={() => onChange({ ...refine, years: toggleInList(refine.years, year) })}
                  title={`${year} · ${count} 篇`}
                  className="group/bar flex h-full flex-1 flex-col justify-end"
                >
                  <span
                    className={cn(
                      "block w-full rounded-t-[3px] transition-all group-hover/bar:brightness-90",
                      active ? "bg-plum" : dimmed ? "bg-ink-4/20" : "bg-ink-4/45",
                    )}
                    style={{ height: `${Math.max(12, (count / maxYearCount) * 100)}%` }}
                  />
                </button>
              );
            })}
          </div>
          <div className="mono mt-1 flex justify-between text-[10px] tabular-nums text-ink-4">
            <span>{yearBars[0].year}</span>
            <span>{yearBars[yearBars.length - 1].year}</span>
          </div>
        </section>
      )}

      {/* 引用下限 */}
      <section>
        <h4 className="mono mb-2 text-[10px] uppercase tracking-wider text-ink-4">被引下限</h4>
        <div className="flex flex-wrap gap-1">
          {CITATION_STEPS.map((step) => (
            <button
              key={step}
              onClick={() => onChange({ ...refine, minCitations: step })}
              className={cn(
                "mono rounded-full border px-2 py-0.5 text-[11px] tabular-nums transition-all",
                refine.minCitations === step
                  ? "border-plum bg-plum/10 text-plum"
                  : "border-line text-ink-3 hover:border-line-strong hover:text-ink",
              )}
            >
              {step === 0 ? "不限" : `${step}+`}
            </button>
          ))}
        </div>
      </section>

      {/* 仅含 PDF */}
      <section>
        <button
          onClick={() => onChange({ ...refine, pdfOnly: !refine.pdfOnly })}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] transition-colors",
            refine.pdfOnly ? "bg-paper text-ink shadow-sm" : "text-ink-3 hover:bg-paper-2/70 hover:text-ink",
          )}
        >
          <FileDown className={cn("h-3.5 w-3.5", refine.pdfOnly ? "text-sage" : "text-ink-4")} />
          <span className="flex-1 text-left">仅含 PDF 全文</span>
          <span className="mono text-[11px] tabular-nums text-ink-4">{pdfCount}</span>
        </button>
      </section>

      {/* 高频会议 / 期刊 */}
      {facets.venues.length > 0 && (
        <section>
          <h4 className="mono mb-2 text-[10px] uppercase tracking-wider text-ink-4">高频来源</h4>
          <div className="space-y-1">
            {facets.venues.slice(0, 6).map(({ venue, count }) => {
              const active = refine.venues.includes(venue);
              return (
                <button
                  key={venue}
                  onClick={() => onChange({ ...refine, venues: toggleInList(refine.venues, venue) })}
                  title={venue}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] transition-colors",
                    active ? "bg-paper text-ink shadow-sm" : "text-ink-3 hover:bg-paper-2/70 hover:text-ink",
                  )}
                >
                  <span className="flex-1 truncate text-left">{venue}</span>
                  <span className="mono text-[11px] tabular-nums text-ink-4">{count}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
