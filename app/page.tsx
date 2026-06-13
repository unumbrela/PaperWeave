"use client";

import { Fragment, useMemo, useState, type CSSProperties } from "react";
import { Search } from "lucide-react";
import { ToolCard } from "@/components/tool-card";
import { Reveal } from "@/components/reveal";
import { PHASES, TOOLS, WORKFLOW_PHASES, type Phase } from "@/lib/tools-registry";
import { cn } from "@/lib/utils";

/** Hero 大标题逐词上浮（reveal-word 遮罩 + word-rise），重点词用流动渐变。 */
const HEADLINE: Array<{ word: string; flow?: boolean; lineBreak?: boolean }> = [
  { word: "From" },
  { word: "papers,", flow: true },
  { word: "to", lineBreak: true },
  { word: "polished" },
  { word: "stories.", flow: true },
];

function formatDisplayDate(date: Date) {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Shanghai",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}.${values.month}.${values.day}`;
}

type Selection = "全部" | Phase;

export default function Home() {
  const [selected, setSelected] = useState<Selection>("全部");
  const [query, setQuery] = useState("");
  const currentDate = formatDisplayDate(new Date());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((t) => {
      if (selected !== "全部" && !t.phases.includes(selected)) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.phases.some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [selected, query]);

  return (
    <>
      {/* HERO */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-6 pt-20 sm:pt-28 pb-16">
          {/* Top meta row */}
          <Reveal className="flex items-center justify-between">
            <div className="overline flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-coral" />
              Research Workflow · Vol. 01
            </div>
            <div className="hidden sm:block overline">{currentDate}</div>
          </Reveal>

          <div className="mt-10 grid grid-cols-12 gap-6 items-end">
            {/* Headline — one language, one face (Fraunces italic with its
                SOFT axis at 100). Words rise out of a mask, accent words flow. */}
            <h1 className="display-italic col-span-12 lg:col-span-9 leading-[0.88] text-[64px] sm:text-[100px] lg:text-[132px] text-ink font-normal">
              {HEADLINE.map((w, i) => (
                <Fragment key={w.word + i}>
                  {w.lineBreak && <br />}
                  <span className="reveal-word">
                    <span
                      className={w.flow ? "text-flow" : undefined}
                      style={{ "--wd": `${140 + i * 95}ms` } as CSSProperties}
                    >
                      {w.word}
                    </span>
                  </span>{" "}
                </Fragment>
              ))}
            </h1>

            {/* Right pull */}
            <Reveal delay={260} className="col-span-12 lg:col-span-3 lg:pb-4">
              <div className="hairline mb-4" />
              <p className="text-[13px] leading-relaxed text-ink-2 max-w-xs">
                这里是 <span className="serif-italic text-ink">PaperWeave</span>
                ，一个研究型论文助手。查文献、生{" "}
                <span className="serif-italic text-ink">idea</span>
                、做验证、讲结果——每一步都有工具，串成一条完整的研究工作流。不替你写论文，只让每一步都顺起来。
              </p>
            </Reveal>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-6">
          <div className="hairline" />
        </div>
      </section>

      {/* WORKFLOW STRIP */}
      <section className="mx-auto w-full max-w-6xl px-6 pt-12">
        <Reveal className="flex items-baseline justify-between mb-6">
          <h2 className="serif text-[22px] sm:text-[26px] tracking-tight text-ink">
            <span className="serif-italic text-ink-2">The</span> Workflow
          </h2>
          <span className="overline text-ink-3">
            7 phases · woven end to end
          </span>
        </Reveal>

        <Reveal
          delay={80}
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2"
        >
          {WORKFLOW_PHASES.map((phase, i) => {
            const active = selected === phase;
            return (
              <button
                key={phase}
                onClick={() => setSelected(active ? "全部" : phase)}
                className={cn(
                  "surface focus-ring group relative rounded-2xl p-4 text-left transition-colors",
                  active
                    ? "border-[var(--line-strong)] bg-paper-2/90"
                    : "hover:border-[var(--line-strong)]",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="numeral text-[20px] leading-none text-ink-3">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-transform",
                      active ? "scale-150 bg-coral" : "bg-ink-4/40",
                    )}
                  />
                </div>
                <div className="mt-4 serif text-[15px] leading-tight text-ink">
                  {phase}
                </div>
              </button>
            );
          })}
        </Reveal>
      </section>

      {/* SEARCH + FILTER */}
      <section className="mx-auto w-full max-w-6xl px-6 pt-12">
        <Reveal className="grid grid-cols-12 gap-6 items-center">
          <div className="col-span-12 lg:col-span-7">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`搜索工具 ·  try "idea"…`}
                className={cn(
                  "surface focus-ring w-full rounded-full",
                  "pl-11 pr-20 py-3 text-[14px] text-ink placeholder:text-ink-3/80",
                  "outline-none transition-colors",
                  "hover:border-[var(--line-strong)]",
                )}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <kbd>⌘</kbd>
                <kbd>K</kbd>
              </span>
            </label>
          </div>
          <div className="col-span-12 lg:col-span-5 flex items-center gap-2 lg:justify-end flex-wrap">
            <span className="overline mr-1">分类</span>
            <div className="surface rounded-full p-1 flex items-center gap-0.5 flex-wrap">
              {PHASES.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelected(p)}
                  className={cn(
                    "px-3 py-1 text-[12px] rounded-full transition-colors whitespace-nowrap",
                    selected === p
                      ? "bg-ink text-paper-2"
                      : "text-ink-2 hover:text-ink",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* TOOLS */}
      <section className="mx-auto w-full max-w-6xl px-6 pt-12 pb-24">
        <Reveal className="flex items-baseline justify-between mb-8">
          <h2 className="serif text-[28px] sm:text-[34px] tracking-tight text-ink">
            <span className="serif-italic text-ink-2">The</span> Collection
          </h2>
          <span className="overline">
            {String(filtered.length).padStart(2, "0")} /{" "}
            {String(TOOLS.length).padStart(2, "0")}
          </span>
        </Reveal>

        {filtered.length === 0 ? (
          <div className="surface rounded-2xl p-12 text-center">
            <p className="serif-italic text-2xl text-ink-2">No match found.</p>
            <p className="mt-2 text-sm text-ink-3">
              Try a different search term.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((tool, i) => (
              <ToolCard key={tool.slug} tool={tool} index={i + 1} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
