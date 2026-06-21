"use client";

import type { ReactNode } from "react";

// 每个流水线阶段的统一外壳：surface 卡片 + 步骤角标 + 标题 + 导语。
export function Stage({
  step,
  title,
  accent,
  intro,
  children,
}: {
  step: string;
  title: ReactNode;
  accent: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rise surface rounded-2xl p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="serif text-[24px] leading-tight text-ink">{title}</h2>
        <span className="overline shrink-0" style={{ color: accent }}>
          {step}
        </span>
      </div>
      <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-ink-2">{intro}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

// 一组小药丸按钮选择器。
export function PillGroup<T extends string | number>({
  options,
  value,
  onChange,
  accent,
  render,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  accent: string;
  render?: (v: T) => ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={String(opt)}
            onClick={() => onChange(opt)}
            className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
              active ? "border-transparent text-white" : "border-line text-ink-2 hover:text-ink"
            }`}
            style={active ? { background: accent } : undefined}
          >
            {render ? render(opt) : String(opt)}
          </button>
        );
      })}
    </div>
  );
}
