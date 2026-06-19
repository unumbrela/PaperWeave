"use client";

import { Fragment, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Search, ArrowUpRight } from "lucide-react";
import { ToolCard } from "@/components/tool-card";
import { Reveal } from "@/components/reveal";
import {
  CORE_FLOW,
  getSupportingTools,
  getGalleryTools,
  getLabTools,
  type Phase,
} from "@/lib/tools-registry";
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

export default function Home() {
  const [query, setQuery] = useState("");
  const currentDate = formatDisplayDate(new Date());

  const supportingTools = useMemo(() => getSupportingTools(), []);
  const galleryTools = useMemo(() => getGalleryTools(), []);
  const labTools = useMemo(() => getLabTools(), []);

  const matchesQuery = (
    t: { name: string; description: string; phases: Phase[] },
    q: string,
  ) =>
    !q ||
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.phases.some((p) => p.toLowerCase().includes(q));

  // 首页核心流程之下的工具一律按关键词过滤（不再按阶段过滤——核心流程已显式列出）。
  const q = query.trim().toLowerCase();
  const filteredSupporting = useMemo(
    () => supportingTools.filter((t) => matchesQuery(t, q)),
    [q, supportingTools],
  );
  const filteredLab = useMemo(
    () => labTools.filter((t) => matchesQuery(t, q)),
    [q, labTools],
  );
  const filteredGallery = useMemo(
    () => galleryTools.filter((t) => matchesQuery(t, q)),
    [q, galleryTools],
  );

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
                ，一个以论文为核心、本地优先的研究工作台。从调研搜索最新论文，到总结、精读挑选、想{" "}
                <span className="serif-italic text-ink">创新点</span>
                、撰写、出图——一条线走完。只搭骨架不代写正文，让每一步都顺起来。
              </p>
            </Reveal>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-6">
          <div className="hairline" />
        </div>
      </section>

      {/* 核心论文流程 —— 围绕一篇论文的线性主线，每步直达对应工具（页面中心） */}
      <section className="mx-auto w-full max-w-6xl px-6 pt-12">
        <Reveal className="flex items-baseline justify-between mb-6">
          <h2 className="serif text-[22px] sm:text-[26px] tracking-tight text-ink">
            <span className="serif-italic text-ink-2">The</span> Paper Workflow
          </h2>
          <span className="overline text-ink-3">核心论文流程 · 一条线走完</span>
        </Reveal>

        <Reveal delay={80} className="relative">
          {/* 织线：贯穿全流程的一条经线（lg 单行时显示），各步织成一条打通的链路。 */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-6 top-1/2 hidden -translate-y-1/2 lg:block"
          >
            <div className="shimmer-line h-px w-full" />
          </div>
          <div className="relative grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {CORE_FLOW.map((step, i) => (
              <Link
                key={step.title}
                href={step.href}
                className="surface focus-ring group relative flex flex-col rounded-2xl p-4 transition-colors hover:border-[var(--line-strong)]"
              >
                <div className="flex items-center justify-between">
                  <span className="numeral text-[20px] leading-none text-ink-3">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[18px] leading-none">{step.icon}</span>
                </div>
                <div className="mt-3 serif text-[15px] leading-tight text-ink">
                  {step.title}
                </div>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3">
                  {step.blurb}
                </p>
                <span className="mt-auto pt-3 inline-flex items-center gap-1 text-[11px] text-ink-2 transition-colors group-hover:text-coral">
                  打开
                  <ArrowUpRight className="h-3 w-3" />
                </span>
                {/* 步间衔接箭头：暗示上游→下游流向（lg 单行时显示，最后一步不画） */}
                {i < CORE_FLOW.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute -right-[7px] top-1/2 z-10 hidden -translate-y-1/2 text-ink-4 transition-colors group-hover:text-coral lg:block"
                  >
                    ›
                  </span>
                )}
              </Link>
            ))}
          </div>
        </Reveal>
      </section>

      {/* SEARCH（仅用于过滤核心流程之下的配套 / 扩展 / 展厅工具） */}
      <section className="mx-auto w-full max-w-6xl px-6 pt-16">
        <Reveal>
          <label className="relative block max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`搜索配套工具 ·  try "对比"…`}
              className={cn(
                "surface focus-ring w-full rounded-full",
                "pl-11 pr-5 py-3 text-[14px] text-ink placeholder:text-ink-3/80",
                "outline-none transition-colors",
                "hover:border-[var(--line-strong)]",
              )}
            />
          </label>
        </Reveal>
      </section>

      {/* 配套工具 —— 围绕主线的补充工具（网页速读 / 整理 / 对比 / 问库 / 图谱 / 提示词…） */}
      <section className="mx-auto w-full max-w-6xl px-6 pt-10 pb-24">
        <Reveal className="flex items-baseline justify-between mb-8">
          <h2 className="serif text-[28px] sm:text-[34px] tracking-tight text-ink">
            <span className="serif-italic text-ink-2">Supporting</span> Tools
          </h2>
          <span className="overline">配套工具 · 按需取用</span>
        </Reveal>

        {filteredSupporting.length === 0 ? (
          <div className="surface rounded-2xl p-12 text-center">
            <p className="serif-italic text-2xl text-ink-2">No match found.</p>
            <p className="mt-2 text-sm text-ink-3">Try a different search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSupporting.map((tool, i) => (
              <ToolCard key={tool.slug} tool={tool} index={i + 1} />
            ))}
          </div>
        )}
      </section>

      {/* LAB — 命令行 / 自动化扩展，独立于论文主线 */}
      {filteredLab.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-6 pb-24">
          <div className="hairline mb-12" />
          <Reveal className="flex items-baseline justify-between mb-3">
            <h2 className="serif text-[28px] sm:text-[34px] tracking-tight text-ink">
              <span className="serif-italic text-ink-2">The</span> Lab
            </h2>
            <span className="overline">命令行 / 自动化扩展</span>
          </Reveal>
          <Reveal delay={60}>
            <p className="text-[13px] leading-relaxed text-ink-2 max-w-xl mb-8">
              偏命令行 / Claude Code 场景的研究自动化工具——把研究想法拆成可执行计划、封装成可复用的 skill。它们独立于上面的论文主线，按需取用。
            </p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredLab.map((tool, i) => (
              <ToolCard key={tool.slug} tool={tool} index={i + 1} />
            ))}
          </div>
        </section>
      )}

      {/* GALLERY — 交互式教学演示，独立于工作流 */}
      {filteredGallery.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-6 pb-24">
          <div className="hairline mb-12" />
          <Reveal className="flex items-baseline justify-between mb-3">
            <h2 className="serif text-[28px] sm:text-[34px] tracking-tight text-ink">
              <span className="serif-italic text-ink-2">The</span> Gallery
            </h2>
            <span className="overline">可视化展厅</span>
          </Reveal>
          <Reveal delay={60}>
            <p className="text-[13px] leading-relaxed text-ink-2 max-w-xl mb-8">
              交互式教学演示——经典模型在浏览器里真实推理 /
              回放，以及科研项目叙事页。它们独立于上面的工作流，不入论文库、不参与一键流转，纯粹用来「看懂」与「讲清」。
            </p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGallery.map((tool, i) => (
              <ToolCard key={tool.slug} tool={tool} index={i + 1} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
