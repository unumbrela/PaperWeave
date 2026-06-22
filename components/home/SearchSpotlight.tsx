"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Maximize2, Sparkles } from "lucide-react";
import { Reveal } from "@/components/reveal";

/** 文献检索环的主色——与 CORE_FLOW「检索」一致（首页织线长卷的 01 站点色）。 */
const ACCENT = "#b14bff";

/**
 * 检索流水线六阶段，与架构图 Paper_Search.png 的编号一一对应。
 * 文案对齐真实实现：lib/paper-search/* 与 app/api/paper-search/route.ts。
 */
const STAGES: { n: string; title: string; desc: string }[] = [
  {
    n: "01",
    title: "检索意图",
    desc: "一句自然语言的研究意图作为起点——不必拼关键词，也不用懂各家检索语法。",
  },
  {
    n: "02",
    title: "LLM 查询扩展",
    desc: "大模型把意图扇出成多条互补子查询，覆盖同义表述与相邻方向；无 key 时自动降级为单查询。",
  },
  {
    n: "03",
    title: "多源并行检索",
    desc: "子查询并行打向 OpenAlex / arXiv / Crossref / Europe PMC 等学术源，单源失败不拖累整体。",
  },
  {
    n: "04",
    title: "去重与合并",
    desc: "按 DOI / arXiv ID / 归一化标题跨源识别同一篇，合并元信息——补齐引用数、PDF、刊名。",
  },
  {
    n: "05",
    title: "重排与定位",
    desc: "联合打分：子查询命中覆盖度 + 新近度 + 引用量综合排序，可选 LLM 对 Top-K 精排。",
  },
  {
    n: "06",
    title: "排序结果",
    desc: "一条干净、按相关性定位好的结果流，可直接加入文献库精读，喂回后续工作流。",
  },
];

/** 这套架构带来的三点实感收益。 */
const PAYOFFS: { k: string; v: string }[] = [
  { k: "召回更全", v: "一次意图扇出多查询 × 多学术源，少漏相邻工作" },
  { k: "排序更准", v: "覆盖度 + 新近度 + 引用量联合打分，可叠加 LLM 精排" },
  { k: "结果更净", v: "跨源去重合并，同一篇只留一条、元信息最全" },
];

/**
 * 检索聚光 —— 把工作流第一步「文献检索」单独讲清楚。
 *
 * 这一步是整条流水线的入口，参考 Perplexity 的检索架构重做：从单一关键词检索，
 * 升级为「意图 → LLM 查询扩展 → 多源并行检索 → 去重合并 → 联合打分重排」的管线。
 * 配上作者绘制的架构图（public/home/paper-search-architecture.png）。
 */
export function SearchSpotlight() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-24">
      <Reveal className="flex items-baseline justify-between mb-3">
        <h2 className="serif text-[28px] sm:text-[34px] tracking-tight text-ink">
          <span className="text-ink-2">Inside</span> Search
        </h2>
        <span className="overline text-ink-3">文献检索 · 借鉴 Perplexity 检索架构</span>
      </Reveal>
      <Reveal delay={60}>
        <p className="text-[13px] leading-relaxed text-ink-2 max-w-2xl mb-10">
          工作流的第一步<span className="serif-italic text-ink">检索</span>
          做了重做。与其让你拼关键词、逐个翻数据库，不如把一句研究意图交给一条
          <span className="text-ink">Perplexity 式</span>
          的检索管线——大模型先把意图扩展成多条子查询，并行打向多个学术源，再去重合并、联合打分重排，最后给出一条干净、定位好的结果流。
        </p>
      </Reveal>

      {/* 架构图：作者自绘，点击放大查看原图 */}
      <Reveal delay={120}>
        <a
          href="/home/paper-search-architecture.png"
          target="_blank"
          rel="noreferrer"
          className="group focus-ring relative block overflow-hidden rounded-[24px] border border-line bg-paper-3"
          title="点击查看大图"
          style={{ ["--accent" as string]: ACCENT }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
            }}
          />
          <div className="flex items-center justify-between px-5 py-3 border-b border-line">
            <span className="overline inline-flex items-center gap-1.5 text-ink-3">
              <Sparkles className="h-3 w-3" style={{ color: ACCENT }} />
              检索架构 · Search Pipeline
            </span>
            <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-3 transition-colors group-hover:text-ink">
              <Maximize2 className="h-3.5 w-3.5" /> 查看大图
            </span>
          </div>
          <div className="relative aspect-[1672/941] w-full bg-white">
            <Image
              src="/home/paper-search-architecture.png"
              alt="文献检索架构图：研究意图 → LLM 查询扩展 → 多源并行检索 → 去重合并 → 联合打分重排 → 排序结果"
              fill
              sizes="(max-width: 1024px) 100vw, 1100px"
              className="object-contain"
              priority={false}
            />
          </div>
        </a>
      </Reveal>

      {/* 六阶段流水线：与架构图编号一一对应 */}
      <Reveal delay={160}>
        <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {STAGES.map((s) => (
            <div
              key={s.n}
              className="surface rounded-[18px] p-5 transition-colors hover:border-[var(--line-strong)]"
            >
              <div className="flex items-baseline gap-2.5">
                <span
                  className="numeral text-[26px] leading-none"
                  style={{ color: ACCENT }}
                >
                  {s.n}
                </span>
                <h3 className="serif text-[18px] leading-none tracking-tight text-ink">
                  {s.title}
                </h3>
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">{s.desc}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* 收益条 + CTA */}
      <Reveal delay={200}>
        <div className="mt-8 surface-strong flex flex-col gap-6 rounded-[22px] px-6 py-7 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid flex-1 gap-x-8 gap-y-4 sm:grid-cols-3">
            {PAYOFFS.map((p) => (
              <div key={p.k}>
                <div className="overline" style={{ color: ACCENT }}>
                  {p.k}
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{p.v}</p>
              </div>
            ))}
          </div>
          <Link
            href="/tools/paper-search"
            className="cta-gradient focus-ring inline-flex shrink-0 items-center gap-2 self-start rounded-full px-6 py-3 text-[14px] font-medium lg:self-center"
          >
            试试检索
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
