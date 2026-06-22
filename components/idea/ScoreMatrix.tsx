"use client";

import { cn } from "@/lib/utils";
import type { Idea } from "@/lib/idea/types";

const PAD_L = 46;
const PAD_R = 14;
const PAD_T = 16;
const PAD_B = 34;
const W = 320;
const H = 300;
const x0 = PAD_L;
const x1 = W - PAD_R;
const y0 = H - PAD_B; // bottom (feasibility = 1)
const y1 = PAD_T; // top (feasibility = 5)

const sx = (novelty: number) => x0 + ((novelty - 1) / 4) * (x1 - x0);
const sy = (feasibility: number) => y0 - ((feasibility - 1) / 4) * (y0 - y1);

/** 把同坐标的点沿小圆错开，避免完全重叠。 */
function spread(ideas: Idea[]): { idea: Idea; cx: number; cy: number; n: number }[] {
  const buckets = new Map<string, number>();
  return ideas.map((idea, i) => {
    const key = `${idea.novelty}-${idea.feasibility}`;
    const k = buckets.get(key) ?? 0;
    buckets.set(key, k + 1);
    const angle = k * 2.4; // 黄金角错位
    const r = k === 0 ? 0 : 7;
    return {
      idea,
      cx: sx(idea.novelty) + Math.cos(angle) * r,
      cy: sy(idea.feasibility) + Math.sin(angle) * r,
      n: i + 1,
    };
  });
}

/** 创新 × 可行 2×2 象限图。右上（高创新×高可行）为最优象限。 */
export function ScoreMatrix({
  ideas,
  recommendedId,
  selectedId,
  onSelect,
  accent = "#f59e0b",
}: {
  ideas: Idea[];
  recommendedId?: string | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  accent?: string;
}) {
  const points = spread(ideas);
  const midX = sx(3);
  const midY = sy(3);

  return (
    <div className="surface rounded-[20px] p-5">
      <div className="overline mb-3 text-ink-3">创新 × 可行 · 象限定位</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="创新性与可行性象限图">
        {/* 最优象限（右上）底色 */}
        <rect x={midX} y={y1} width={x1 - midX} height={midY - y1} fill="rgba(245,158,11,0.07)" />
        {/* 网格边框 */}
        <rect x={x0} y={y1} width={x1 - x0} height={y0 - y1} fill="none" stroke="var(--line)" />
        {/* 中线 */}
        <line x1={midX} y1={y1} x2={midX} y2={y0} stroke="var(--line)" strokeDasharray="3 3" />
        <line x1={x0} y1={midY} x2={x1} y2={midY} stroke="var(--line)" strokeDasharray="3 3" />

        {/* 轴标签 */}
        <text x={(x0 + x1) / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--ink-3)">
          创新性 →
        </text>
        <text
          x={14}
          y={(y0 + y1) / 2}
          textAnchor="middle"
          fontSize="11"
          fill="var(--ink-3)"
          transform={`rotate(-90, 14, ${(y0 + y1) / 2})`}
        >
          可行性 →
        </text>
        <text x={x1 - 4} y={y1 + 13} textAnchor="end" fontSize="9.5" fill={accent}>
          甜区
        </text>

        {/* 数据点 */}
        {points.map(({ idea, cx, cy, n }) => {
          const isRec = idea.id === recommendedId;
          const isSel = idea.id === selectedId;
          return (
            <g
              key={idea.id}
              className={onSelect ? "cursor-pointer" : undefined}
              onClick={() => onSelect?.(idea.id)}
            >
              {isSel && <circle cx={cx} cy={cy} r={15} fill="none" stroke={accent} strokeWidth={1.5} />}
              <circle cx={cx} cy={cy} r={11} fill={isRec ? accent : "var(--paper-2)"} stroke={accent} strokeWidth={1.5} />
              <text
                x={cx}
                y={cy + 3.5}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill={isRec ? "#fff" : "var(--ink-2)"}
              >
                {n}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: accent }} /> 推荐
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={cn("inline-block h-2.5 w-2.5 rounded-full border bg-paper-2")} style={{ borderColor: accent }} /> 候选
        </span>
      </div>
    </div>
  );
}
