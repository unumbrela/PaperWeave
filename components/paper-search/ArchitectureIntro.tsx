"use client";

import Image from "next/image";
import { Sparkles, Maximize2, Layers, Target, Sparkle, ShieldCheck } from "lucide-react";

/** 检索环主色——与首页织线长卷「01 检索」站点一致。 */
const ACCENT = "#b14bff";

/**
 * 检索流水线六阶段，与架构图 architecture.png 的编号一一对应。
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

/** 相对「单关键词 + 单库」传统检索的几点优势。 */
const ADVANTAGES: { icon: typeof Layers; k: string; v: string }[] = [
  {
    icon: Layers,
    k: "召回更全",
    v: "一句意图扇出多条子查询 × 多个学术源并行检索，少漏同义表述与相邻工作。",
  },
  {
    icon: Target,
    k: "排序更准",
    v: "覆盖度 + 新近度 + 引用量联合打分定位，可叠加 LLM 对 Top-K 精排。",
  },
  {
    icon: Sparkle,
    k: "结果更净",
    v: "跨源按 DOI / arXiv ID / 标题去重合并，同一篇只留一条、元信息最全。",
  },
  {
    icon: ShieldCheck,
    k: "稳又可控",
    v: "单源失败不拖累整体，结果带缓存加速；本地优先、自带 key（BYOK），无 key 也能用。",
  },
];

/**
 * 检索架构介绍 —— 检索页初始空态的「门面」。
 *
 * 不止放一张图：讲清这套借鉴 Perplexity 的检索管线（意图 → LLM 扩展 → 多源并行
 * → 去重合并 → 联合打分重排），逐阶段拆解，并点明相对传统「单关键词单库」检索的优势。
 * 架构图细节多、文字小，用 unoptimized 直出原图 PNG（优化器上限 1080px/quality80 会糊字）。
 */
export function ArchitectureIntro() {
  return (
    <div className="w-full px-1 py-2 text-left">
      {/* 标题 + 一句话定位 */}
      <div className="mx-auto max-w-3xl text-center">
        <p className="overline inline-flex items-center gap-1.5 text-ink-3">
          <Sparkles className="h-3 w-3 text-plum" />
          检索架构 · 借鉴 Perplexity 检索管线
        </p>
        <h2 className="serif mt-3 text-[24px] leading-snug tracking-tight text-ink sm:text-[28px]">
          一句研究意图，换一条干净的结果流
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
          与其逐个数据库拼关键词，不如把意图交给一条流水线：大模型先把它
          <span className="text-ink">扩展成多条子查询</span>，并行打向多个学术源，再
          <span className="text-ink">去重合并、联合打分重排</span>，给出一条定位好、可直接精读入库的结果。
        </p>
      </div>

      {/* 架构图：点击查看大图 */}
      <a
        href="/paper-search/architecture.png"
        target="_blank"
        rel="noreferrer"
        className="group focus-ring mx-auto mt-6 block max-w-5xl overflow-hidden rounded-2xl border border-line bg-white"
        title="点击查看大图"
        style={{ ["--accent" as string]: ACCENT }}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <span className="overline inline-flex items-center gap-1.5 text-ink-3">
            <Sparkles className="h-3 w-3 text-plum" />
            Search Pipeline
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-3 transition-colors group-hover:text-ink">
            <Maximize2 className="h-3.5 w-3.5" /> 查看大图
          </span>
        </div>
        <div className="relative aspect-[1672/941] w-full">
          {/* 细节多、文字小：跳过优化器（上限 1080px/quality80 + WebP 重压会糊掉细线小字），直出原图 PNG。 */}
          <Image
            src="/paper-search/architecture.png"
            alt="文献检索架构图：研究意图 → LLM 查询扩展 → 多源并行检索 → 去重合并 → 联合打分重排 → 排序结果"
            fill
            sizes="(max-width: 1024px) 100vw, 1000px"
            unoptimized
            className="object-contain transition-transform duration-500 group-hover:scale-[1.01]"
          />
        </div>
      </a>

      {/* 六阶段流水线：与架构图编号一一对应 */}
      <div className="mx-auto mt-8 max-w-5xl">
        <p className="overline text-ink-4">检索流程 · 六个阶段</p>
        <div className="mt-3 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {STAGES.map((s) => (
            <div
              key={s.n}
              className="rounded-[16px] border border-line bg-[rgba(26,23,19,0.015)] p-4 transition-colors hover:border-plum/40"
            >
              <div className="flex items-baseline gap-2.5">
                <span className="numeral text-[24px] leading-none" style={{ color: ACCENT }}>
                  {s.n}
                </span>
                <h3 className="serif text-[17px] leading-none tracking-tight text-ink">
                  {s.title}
                </h3>
              </div>
              <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-2">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 优势：相对单关键词单库的传统检索 */}
      <div className="mx-auto mt-8 max-w-5xl">
        <p className="overline text-ink-4">我们的优势 · 相对「单关键词 + 单库」检索</p>
        <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {ADVANTAGES.map((a) => {
            const Icon = a.icon;
            return (
              <div key={a.k} className="flex gap-3">
                <span
                  className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ background: `color-mix(in srgb, ${ACCENT} 12%, transparent)` }}
                >
                  <Icon className="h-4 w-4" style={{ color: ACCENT }} />
                </span>
                <div>
                  <div className="text-[13.5px] font-medium text-ink">{a.k}</div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{a.v}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
