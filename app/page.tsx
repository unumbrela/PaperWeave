"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ToolCard } from "@/components/tool-card";
import { CATEGORIES, TOOLS } from "@/lib/tools-registry";
import { cn } from "@/lib/utils";

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

export default function Home() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("全部");
  const [query, setQuery] = useState("");
  const currentDate = formatDisplayDate(new Date());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((t) => {
      if (category !== "全部" && t.category !== category) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [category, query]);

  return (
    <>
      {/* HERO */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-6 pt-20 sm:pt-28 pb-20 sm:pb-28">
          {/* Top meta row */}
          <div
            className="rise-d flex items-center justify-between"
            style={{ animationDelay: "40ms" }}
          >
            <div className="overline flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-coral" />
              An Essay in Tools · Vol. 01
            </div>
            <div className="hidden sm:block overline">{currentDate}</div>
          </div>

          <div className="mt-10 grid grid-cols-12 gap-6 items-end">
            {/* Headline — one language, one face (Fraunces italic with its
                SOFT axis at 100). No mixed English/Chinese typography; the
                whole line breathes as a single artistic display serif. */}
            <h1
              className="rise display-italic col-span-12 lg:col-span-9 leading-[0.88] text-[64px] sm:text-[100px] lg:text-[132px] text-ink font-normal"
              style={{ animationDelay: "120ms" }}
            >
              Tools for thought,
              <br />
              made to <span>keep</span>.
            </h1>

            {/* Right pull */}
            <div
              className="rise col-span-12 lg:col-span-3 lg:pb-4"
              style={{ animationDelay: "260ms" }}
            >
              <div className="hairline mb-4" />
              <p className="text-[13px] leading-relaxed text-ink-2 max-w-xs">
                这里收着一些认真做过的小工具：有{" "}
                <span className="serif-italic text-ink">AI</span>{" "}
                写作与编程辅助，也有本地文档处理和带解释的交互式可视化。它们不急着求全，只求真正好用、好看，也值得留下。
              </p>
            </div>
          </div>

          {/* Search + meta */}
          <div
            className="rise-d mt-14 grid grid-cols-12 gap-6 items-center"
            style={{ animationDelay: "380ms" }}
          >
            <div className="col-span-12 lg:col-span-7">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`搜索工具 ·  try "code"…`}
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
            <div className="col-span-12 lg:col-span-5 flex items-center gap-2 lg:justify-end">
              <span className="overline mr-1">分类</span>
              <div className="surface rounded-full p-1 flex items-center gap-0.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={cn(
                      "px-3.5 py-1 text-[12px] rounded-full transition-colors",
                      category === c
                        ? "bg-ink text-paper-2"
                        : "text-ink-2 hover:text-ink",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-6">
          <div className="hairline" />
        </div>
      </section>

      {/* TOOLS */}
      <section className="mx-auto w-full max-w-6xl px-6 pt-12 pb-24">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="serif text-[28px] sm:text-[34px] tracking-tight text-ink">
            <span className="serif-italic text-ink-2">The</span> Collection
          </h2>
          <span className="overline">
            {String(filtered.length).padStart(2, "0")} / {String(TOOLS.length).padStart(2, "0")}
          </span>
        </div>

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
