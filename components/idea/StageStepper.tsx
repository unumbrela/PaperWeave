"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type StageKey = "diagnose" | "design" | "converge";

const STAGES: { key: StageKey; label: string; sub: string }[] = [
  { key: "diagnose", label: "诊断", sub: "拆解现状" },
  { key: "design", label: "设计", sub: "按透镜发散" },
  { key: "converge", label: "收敛", sub: "评分排序" },
];

/** 三阶段进度条：已完成打勾、当前高亮 accent、未达灰显。点击可回跳已完成阶段。 */
export function StageStepper({
  current,
  reached,
  onJump,
  accent = "#f59e0b",
}: {
  current: StageKey;
  /** 已抵达（可点击回跳）的阶段集合。 */
  reached: Set<StageKey>;
  onJump?: (key: StageKey) => void;
  accent?: string;
}) {
  const currentIdx = STAGES.findIndex((s) => s.key === current);

  return (
    <div className="surface flex items-stretch gap-1 rounded-[18px] p-2">
      {STAGES.map((stage, i) => {
        const idx = i;
        const isActive = stage.key === current;
        const isDone = idx < currentIdx && reached.has(stage.key);
        const canJump = reached.has(stage.key) && !isActive;
        return (
          <button
            key={stage.key}
            type="button"
            disabled={!canJump}
            onClick={() => canJump && onJump?.(stage.key)}
            className={cn(
              "group flex flex-1 items-center gap-3 rounded-[12px] px-4 py-3 text-left transition-colors",
              canJump ? "cursor-pointer hover:bg-[rgba(26,23,19,0.04)]" : "cursor-default",
            )}
            style={isActive ? { background: "rgba(245,158,11,0.10)" } : undefined}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-medium transition-colors",
                isActive || isDone ? "text-white" : "text-ink-3",
              )}
              style={{
                background: isActive || isDone ? accent : "var(--paper-3)",
              }}
            >
              {isDone ? <Check className="h-3.5 w-3.5" /> : idx + 1}
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-[13px] font-medium leading-tight",
                  isActive ? "text-ink" : isDone ? "text-ink-2" : "text-ink-3",
                )}
              >
                {stage.label}
              </span>
              <span className="block text-[11px] text-ink-4 leading-tight">{stage.sub}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
