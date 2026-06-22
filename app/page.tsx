"use client";

import { Fragment, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Search, ArrowUpRight, ArrowRight, Terminal } from "lucide-react";
import { ToolCard } from "@/components/tool-card";
import { Reveal } from "@/components/reveal";
import { WeaveJourney } from "@/components/home/WeaveJourney";
import { WeaveOutcome } from "@/components/home/WeaveOutcome";
import { SearchSpotlight } from "@/components/home/SearchSpotlight";
import { HeroBackdrop } from "@/components/home/HeroBackdrop";
import {
  getSupportingTools,
  getUtilityTools,
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

const TRUST_POINTS = ["本地优先", "零配置可用", "6 步闭环", "BYOK 自带 key"];

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
  const utilityTools = useMemo(() => getUtilityTools(), []);
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
  const filteredUtility = useMemo(
    () => utilityTools.filter((t) => matchesQuery(t, q)),
    [q, utilityTools],
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
      <section className="relative overflow-hidden">
        <HeroBackdrop />
        <div className="relative z-10 mx-auto max-w-6xl px-6 pt-20 sm:pt-28 pb-14">
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
                ，一个以论文为核心、本地优先的研究工作台。从检索最新论文，到精读、梳理、{" "}
                <span className="text-ink">立论</span>
                、撰写、制图——一条线走完。只搭骨架不代写正文，让每一步都顺起来。
              </p>
            </Reveal>
          </div>

          {/* CTA + 可信微标 */}
          <Reveal delay={360} className="mt-12 flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/tools/paper-search"
                className="cta-gradient focus-ring inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium"
              >
                开始检索
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/library"
                className="surface focus-ring inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] text-ink-2 transition-colors hover:text-ink hover:border-[var(--line-strong)]"
              >
                进入论文库
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {TRUST_POINTS.map((p) => (
                <span key={p} className="overline flex items-center gap-2">
                  <span className="inline-block h-1 w-1 rounded-full bg-ink-4" />
                  {p}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <div className="hairline" />
        </div>
      </section>

      {/* 核心论文流程 —— 织线·旅程长卷，围绕一篇论文的线性主线（页面主角） */}
      <section className="mx-auto w-full max-w-6xl px-6 pt-16">
        <Reveal className="flex items-baseline justify-between mb-3">
          <h2 className="serif text-[28px] sm:text-[34px] tracking-tight text-ink">
            <span className="text-ink-2">The</span> Paper Workflow
          </h2>
          <span className="overline text-ink-3">核心论文流程 · 一条线走完</span>
        </Reveal>
        <Reveal delay={60}>
          <p className="text-[13px] leading-relaxed text-ink-2 max-w-xl mb-12">
            围绕「一篇论文」的线性旅程，二字动词链一步接一步：
            <span className="serif-italic text-ink">上游产出即下游输入</span>
            ，到最后回存论文库，闭合「检索—生成—回存」回环。
          </p>
        </Reveal>

        <WeaveJourney />
      </section>

      {/* 检索聚光 —— 把第一步「文献检索」讲清楚：Perplexity 式检索架构 + 自绘架构图 */}
      <SearchSpotlight />

      {/* 完整示例 —— 工作流的终点产物：一篇真实跑完整条流程的论文 */}
      <WeaveOutcome />

      {/* SEARCH（仅用于过滤核心流程之下的配套 / 扩展 / 展厅工具） */}
      <section className="mx-auto w-full max-w-6xl px-6 pt-24">
        <Reveal>
          <label className="relative block max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`在全部工具中搜索 ·  try "对比"…`}
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
        <Reveal className="flex items-baseline justify-between mb-3">
          <h2 className="serif text-[28px] sm:text-[34px] tracking-tight text-ink">
            <span className="text-ink-2">Supporting</span> Tools
          </h2>
          <span className="overline">配套工具 · 围绕主干</span>
        </Reveal>
        <Reveal delay={60}>
          <p className="text-[13px] leading-relaxed text-ink-2 max-w-xl mb-8">
            紧贴主线各环、可一键流转的配套——要点提炼、文献对比、引文图谱，都直接喂回检索·精读·梳理。需要哪一步就取哪一个。
          </p>
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

      {/* UTILITIES — 与主干松耦合的外围工具（网页速览 / 文库问答 / 格式转译），下放但仍可直达 */}
      {filteredUtility.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-6 pb-24">
          <div className="hairline mb-12" />
          <Reveal className="flex items-baseline justify-between mb-3">
            <h2 className="serif text-[28px] sm:text-[34px] tracking-tight text-ink">
              <span className="text-ink-2">More</span> Utilities
            </h2>
            <span className="overline">更多工具 · 松耦合</span>
          </Reveal>
          <Reveal delay={60}>
            <p className="text-[13px] leading-relaxed text-ink-2 max-w-xl mb-8">
              与主干松耦合、按需取用：网页速览、文库问答、格式转译——不在主线上，但随手够得着。
            </p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredUtility.map((tool, i) => (
              <ToolCard key={tool.slug} tool={tool} index={i + 1} />
            ))}
          </div>
        </section>
      )}

      {/* LAB — 命令行 / 自动化扩展，独立于论文主线（终端气质，区别于玻璃卡） */}
      {filteredLab.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-6 pb-24">
          <div className="hairline mb-12" />
          <Reveal className="flex items-baseline justify-between mb-3">
            <h2 className="serif text-[28px] sm:text-[34px] tracking-tight text-ink">
              <span className="text-ink-2">The</span> Lab
            </h2>
            <span className="overline">命令行 / 自动化扩展</span>
          </Reveal>
          <Reveal delay={60}>
            <p className="text-[13px] leading-relaxed text-ink-2 max-w-xl mb-8">
              偏命令行 / Claude Code 场景的研究自动化——把研究想法拆成可执行计划、封装成可复用的 skill。独立于上面的论文主线，按需取用。
            </p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {filteredLab.map((tool) => (
              <Link
                key={tool.slug}
                href={tool.href}
                className="terminal-card focus-ring group block rounded-[20px] p-6"
              >
                <div className="mono flex items-center gap-2 text-[12px] text-[#a89f93]">
                  <Terminal className="h-3.5 w-3.5 text-[#6b9b6f]" />
                  <span className="text-[#6b9b6f]">~/research</span>
                  <span className="text-[#7a736a]">❯</span>
                  <span className="text-[#ebe4d4]">{tool.slug}</span>
                </div>
                <h3 className="mt-5 serif text-[24px] leading-tight tracking-tight text-[#faf6ec]">
                  {tool.name}
                </h3>
                <p className="mt-3 text-[13px] leading-relaxed text-[#a89f93]">
                  {tool.description}
                </p>
                <span className="mono mt-6 inline-flex items-center gap-1.5 text-[12px] text-[#c7b4ff] transition-colors group-hover:text-[#e3d8ff]">
                  运行
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* GALLERY — 交互式教学演示，独立于工作流（视觉化大卡 showcase） */}
      {filteredGallery.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-6 pb-24">
          <div className="hairline mb-12" />
          <Reveal className="flex items-baseline justify-between mb-3">
            <h2 className="serif text-[28px] sm:text-[34px] tracking-tight text-ink">
              <span className="text-ink-2">The</span> Gallery
            </h2>
            <span className="overline">可视化展厅</span>
          </Reveal>
          <Reveal delay={60}>
            <p className="text-[13px] leading-relaxed text-ink-2 max-w-xl mb-8">
              交互式教学演示——经典模型在浏览器里真实推理 /
              回放，以及科研项目叙事页。独立于工作流，纯粹用来「看懂」与「讲清」。
            </p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {filteredGallery.map((tool, i) => (
              <Reveal key={tool.slug} delay={i * 70}>
                <Link
                  href={tool.href}
                  className="card-glass sheen focus-ring group block overflow-hidden rounded-[22px]"
                >
                  {/* 统一中性 banner（不用彩色背板）：emoji 招贴 + 浅底角标 */}
                  <div className="relative flex h-28 items-end border-b border-line bg-paper-3 p-5">
                    <span
                      aria-hidden
                      className="absolute right-4 top-3 text-[44px] leading-none opacity-90 transition-transform duration-500 group-hover:scale-110"
                    >
                      {tool.icon}
                    </span>
                    <span className="overline rounded-full border border-line bg-paper/80 px-2.5 py-1 text-ink-3 backdrop-blur-sm">
                      展厅
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="serif text-[22px] leading-tight tracking-tight text-ink">
                      {tool.name}
                    </h3>
                    <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
                      {tool.description}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-ink-2 transition-colors group-hover:text-ink">
                      <span className="serif-italic">Explore</span>
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* 收尾 CTA band —— 呼应 hero，给页面一个收口 */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-28">
        <Reveal className="surface-strong relative overflow-hidden rounded-[28px] px-8 py-14 text-center sm:px-12">
          <span
            aria-hidden
            className="shimmer-line pointer-events-none absolute inset-x-0 top-0 h-px"
          />
          <p className="overline text-ink-3">Start weaving</p>
          <h2 className="mt-4 display-italic text-[40px] leading-[1.05] text-ink sm:text-[56px]">
            From <span className="text-flow">papers</span>, to{" "}
            <span className="text-flow">stories</span>.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[13.5px] leading-relaxed text-ink-2">
            从一个关键词开始，让检索、精读、立论、撰写、制图，织成同一条工作流。
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/tools/paper-search"
              className="cta-gradient focus-ring inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium"
            >
              开始检索
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/library"
              className="surface focus-ring inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] text-ink-2 transition-colors hover:text-ink hover:border-[var(--line-strong)]"
            >
              进入论文库
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
