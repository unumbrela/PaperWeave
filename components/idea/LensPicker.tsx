"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { LENSES } from "@/lib/idea/lenses";

/** 创新透镜选择网格 —— 勾选 1–3 个发散策略，注入设计阶段 prompt。 */
export function LensPicker({
  selected,
  onToggle,
  max = 3,
  accent = "#f59e0b",
}: {
  selected: string[];
  onToggle: (id: string) => void;
  max?: number;
  accent?: string;
}) {
  const atCap = selected.length >= max;

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="overline">创新透镜</span>
        <span className="text-[11px] text-ink-4">
          已选 {selected.length}/{max}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {LENSES.map((lens) => {
          const on = selected.includes(lens.id);
          const disabled = !on && atCap;
          return (
            <button
              key={lens.id}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(lens.id)}
              title={lens.hint}
              className={cn(
                "focus-ring group relative flex flex-col gap-1.5 rounded-[14px] border p-3 text-left transition-all",
                on ? "border-transparent" : "border-line bg-paper-2/60 hover:border-line-strong",
                disabled && "opacity-40 cursor-not-allowed",
              )}
              style={on ? { background: "rgba(245,158,11,0.10)", borderColor: accent } : undefined}
            >
              {on && (
                <span
                  className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full text-white"
                  style={{ background: accent }}
                >
                  <Check className="h-2.5 w-2.5" />
                </span>
              )}
              <span className="text-[18px] leading-none">{lens.icon}</span>
              <span className="text-[12.5px] font-medium text-ink">{lens.name}</span>
              <span className="text-[10.5px] leading-snug text-ink-3">{lens.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
