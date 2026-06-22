"use client";

import { cn } from "@/lib/utils";
import { Check, Lightbulb, AlertCircle, Sparkles } from "lucide-react";
import type { Diagnosis } from "@/lib/idea/types";

function Chip({
  active,
  onClick,
  children,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-ring flex w-full items-start gap-2 rounded-xl border px-3.5 py-2.5 text-left text-[12.5px] leading-snug transition-all",
        active ? "border-transparent text-ink" : "border-line bg-paper-2/50 text-ink-2 hover:border-line-strong",
      )}
      style={active ? { background: "rgba(245,158,11,0.10)", borderColor: accent } : undefined}
    >
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors",
          active ? "border-transparent text-white" : "border-line-strong text-transparent",
        )}
        style={active ? { background: accent } : undefined}
      >
        <Check className="h-3 w-3" />
      </span>
      <span className="min-w-0">{children}</span>
    </button>
  );
}

/**
 * 研究地形图 —— 渲染诊断结果。贡献只读；假设 / 空白 可勾选作为攻击支点。
 * 选中的 id 通过 selected 传入，onToggle 回传 id。
 */
export function GapMap({
  diagnosis,
  selected,
  onToggle,
  accent = "#f59e0b",
}: {
  diagnosis: Diagnosis;
  selected: string[];
  onToggle: (id: string) => void;
  accent?: string;
}) {
  return (
    <div className="space-y-5">
      {!diagnosis.grounded && (
        <p className="rounded-xl border border-line bg-paper-2/50 px-4 py-2.5 text-[12px] text-ink-3">
          参考资料有限，以下诊断基于方向常识推断，建议补充参考论文后重新诊断。
        </p>
      )}

      {diagnosis.contributions.length > 0 && (
        <section>
          <div className="overline mb-2.5 flex items-center gap-1.5 text-ink-3">
            <Lightbulb className="h-3.5 w-3.5" /> 现有创新点
          </div>
          <ul className="space-y-1.5">
            {diagnosis.contributions.map((c, i) => (
              <li key={i} className="flex gap-2 text-[12.5px] leading-snug text-ink-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-4" />
                {c}
              </li>
            ))}
          </ul>
        </section>
      )}

      {diagnosis.assumptions.length > 0 && (
        <section>
          <div className="overline mb-2.5 flex items-center gap-1.5 text-ink-3">
            <Sparkles className="h-3.5 w-3.5" /> 承重假设
            <span className="font-sans normal-case tracking-normal text-ink-4">· 反转它们就是创新口</span>
          </div>
          <div className="space-y-2">
            {diagnosis.assumptions.map((a) => (
              <Chip key={a.id} active={selected.includes(a.id)} onClick={() => onToggle(a.id)} accent={accent}>
                {a.text}
              </Chip>
            ))}
          </div>
        </section>
      )}

      {diagnosis.gaps.length > 0 && (
        <section>
          <div className="overline mb-2.5 flex items-center gap-1.5 text-ink-3">
            <AlertCircle className="h-3.5 w-3.5" /> 研究空白
            <span className="font-sans normal-case tracking-normal text-ink-4">· 勾选要攻击的目标</span>
          </div>
          <div className="space-y-2">
            {diagnosis.gaps.map((g) => (
              <Chip key={g.id} active={selected.includes(g.id)} onClick={() => onToggle(g.id)} accent={accent}>
                {g.tag && (
                  <span
                    className="mr-1.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ background: "rgba(245,158,11,0.14)", color: "#9a6a08" }}
                  >
                    {g.tag}
                  </span>
                )}
                {g.text}
              </Chip>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
