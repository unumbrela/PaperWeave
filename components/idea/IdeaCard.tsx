"use client";

import { cn } from "@/lib/utils";
import { Star, AlertTriangle, Check } from "lucide-react";
import type { Idea } from "@/lib/idea/types";

/** 5 点评分条。 */
function Score({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-[10.5px] text-ink-3">{label}</span>
      <span className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: i <= value ? accent : "var(--paper-3)" }}
          />
        ))}
      </span>
      <span className="text-[10.5px] font-medium text-ink-2">{value}</span>
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div>
      <div className="overline mb-1 text-[10px] text-ink-4">{label}</div>
      <p className="text-[12.5px] leading-relaxed text-ink-2">{children}</p>
    </div>
  );
}

/** 结构化 idea 卡片：编号 + 评分徽章 + 四段 + 风险 + 选取按钮。 */
export function IdeaCard({
  idea,
  n,
  recommended = false,
  selected = false,
  onSelect,
  accent = "#f59e0b",
}: {
  idea: Idea;
  n: number;
  recommended?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  accent?: string;
}) {
  return (
    <div
      className={cn(
        "surface rounded-[20px] p-5 transition-all",
        selected && "ring-1",
      )}
      style={selected ? ({ "--tw-ring-color": accent, boxShadow: `0 0 0 1px ${accent}` } as React.CSSProperties) : undefined}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
          style={{ background: "rgba(245,158,11,0.12)", color: "#9a6a08" }}
        >
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="flex-1 text-[15px] font-medium leading-snug text-ink">{idea.title}</h3>
            {recommended && (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium text-white"
                style={{ background: accent }}
              >
                <Star className="h-3 w-3" /> 推荐
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <Score label="创新" value={idea.novelty} accent={accent} />
            <Score label="可行" value={idea.feasibility} accent={accent} />
            {idea.lens && (
              <span className="rounded-full border border-line px-2 py-0.5 text-[10.5px] text-ink-3">
                {idea.lens}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <Field label="动机">{idea.motivation}</Field>
        <Field label="差异化假设">{idea.hypothesis}</Field>
        <Field label="最小验证实验">{idea.experiment}</Field>
        <Field label="资源开销">{idea.resources}</Field>
      </div>

      {idea.risk && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-line bg-paper-2/50 px-3 py-2 text-[12px] leading-snug text-ink-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" />
          <span>{idea.risk}</span>
        </div>
      )}

      {onSelect && (
        <button
          type="button"
          onClick={() => onSelect(idea.id)}
          className={cn(
            "focus-ring mt-4 inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[12px] font-medium transition-all",
            selected ? "border-transparent text-white" : "border-line bg-paper-2/70 text-ink-2 hover:border-line-strong hover:text-ink",
          )}
          style={selected ? { background: accent } : undefined}
        >
          {selected ? <Check className="h-3.5 w-3.5" /> : null}
          {selected ? "已选作下游" : "选这条做下游"}
        </button>
      )}
    </div>
  );
}
