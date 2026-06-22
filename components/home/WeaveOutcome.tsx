"use client";

import Image from "next/image";
import Link from "next/link";
import { FileText, ArrowUpRight, Microscope } from "lucide-react";
import { Reveal } from "@/components/reveal";

/** 完整示例论文（作者自有，与展厅 FWMamba-UNet 医学分割演示同源）。 */
const PAPER = {
  pdf: "/examples/fwmamba-unet.pdf",
  cover: "/examples/fwmamba-unet-cover.jpg",
  title: "FWMamba-UNet: Frequency-Wavelet Enhanced Mamba UNet for Medical Image Segmentation",
  authors: "Zihao Guo, Haoyu Yang, Zehan Zhao, Jiaming Xu, Hongyan Yin, Yuechen Zhang",
  affiliation: "Jiangnan University",
  venue: "会议论文 · 投稿格式",
  abstract:
    "状态空间模型（Mamba）在密集预测里边界总是模糊——我们把它归因为一种结构性高频衰减（SHFA），并提出 FWMamba-UNet：用小波分支把高频信息走外部通路绕过 SSM 的固有衰减，仅增 10.1% 参数即在 Synapse / ACDC / ISIC 2018 上取得 SOTA。",
} as const;

/** 六步主线如何落到这一篇真实论文上（与 CORE_FLOW 一一对应）。 */
const STEP_MAP: { k: string; icon: string; d: string }[] = [
  { k: "检索", icon: "🔎", d: "聚合检索 Mamba / SSM 医学分割的相关工作（VM-UNet、U-Mamba、Swin-UMamba…）入库。" },
  { k: "精读", icon: "📖", d: "精读 HiPPO 初始化与谱偏置（Yu et al.）相关论文，批注出「高频被结构性衰减」的线索。" },
  { k: "梳理", icon: "🌳", d: "梳理 SSM→Mamba→医学分割的发展谱系，把「边界模糊」显化为一个尚未被正面解决的研究空白。" },
  { k: "立论", icon: "💡", d: "立起 SHFA 假说，提出 FW-Mamba Block（小波分支）+ EAFF-Skip，含最小验证实验与消融。" },
  { k: "撰写", icon: "✍️", d: "把创新点与素材搭成 Abstract / Intro / Method / Experiments 的结构与段落脚手架。" },
  { k: "制图", icon: "🎨", d: "为方法架构与对比结果产出出版级图表（投稿单双栏尺寸、色盲友好配色）。" },
];

/**
 * 完整示例 —— 工作流的「终点产物」。
 *
 * 首页核心流程（WeaveJourney）把六步抽象地铺开；这一节把它落到一篇真实、完整的论文上：
 * 作者自有的 FWMamba-UNet（与展厅医学分割演示同源），让「走完整条线长这样」变得具体可触。
 * PDF 与封面在 public/examples/ 下，封面可点开整篇 PDF。
 */
export function WeaveOutcome() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-24">
      <Reveal className="flex items-baseline justify-between mb-3">
        <h2 className="serif text-[28px] sm:text-[34px] tracking-tight text-ink">
          <span className="text-ink-2">A Finished</span> Paper
        </h2>
        <span className="overline text-ink-3">完整示例 · 走完整条流程长这样</span>
      </Reveal>
      <Reveal delay={60}>
        <p className="text-[13px] leading-relaxed text-ink-2 max-w-2xl mb-10">
          六步主线不止是抽象的动词链。下面是一篇<span className="serif-italic text-ink">真实跑完整条流程</span>
          的论文——它与展厅里的 FWMamba-UNet 医学分割演示同源，从检索相关工作，到读出研究空白、立起假说、搭出结构、画清图表，每一步都对得上号。
        </p>
      </Reveal>

      <Reveal delay={120}>
        <div className="surface overflow-hidden rounded-[24px]">
          <div className="grid gap-0 lg:grid-cols-[300px_1fr]">
            {/* 封面：点击打开整篇 PDF */}
            <a
              href={PAPER.pdf}
              target="_blank"
              rel="noreferrer"
              className="group/cover focus-ring relative block border-b border-line bg-paper-3 p-6 lg:border-b-0 lg:border-r"
              title="打开完整 PDF"
            >
              <div className="relative mx-auto aspect-[1000/1415] w-full max-w-[240px] overflow-hidden rounded-lg border border-line bg-white shadow-[0_8px_30px_rgba(26,23,19,0.10)] transition-transform duration-500 group-hover/cover:-translate-y-1">
                <Image
                  src={PAPER.cover}
                  alt={`论文首页：${PAPER.title}`}
                  fill
                  sizes="240px"
                  className="object-contain"
                />
              </div>
              <span className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-ink-3 transition-colors group-hover/cover:text-coral">
                <FileText className="h-3.5 w-3.5" /> 打开完整 PDF · 29 页
              </span>
            </a>

            {/* 右侧：元信息 + 摘要 + 六步落点 */}
            <div className="p-6 sm:p-8">
              <span className="overline inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-2/70 px-2.5 py-1 text-ink-3">
                <Microscope className="h-3 w-3" /> {PAPER.venue}
              </span>
              <h3 className="serif mt-3 text-[21px] leading-snug text-ink">{PAPER.title}</h3>
              <p className="mt-2 text-[12.5px] text-ink-3">
                {PAPER.authors} · {PAPER.affiliation}
              </p>
              <p className="mt-4 text-[13px] leading-relaxed text-ink-2">{PAPER.abstract}</p>

              {/* 六步如何落到这一篇上 */}
              <div className="mt-6 overline text-ink-4">这一篇是怎么走出来的</div>
              <ol className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {STEP_MAP.map((s, i) => (
                  <li key={s.k} className="flex gap-2.5">
                    <span aria-hidden className="mt-0.5 text-[15px] leading-none">
                      {s.icon}
                    </span>
                    <p className="text-[12.5px] leading-relaxed text-ink-2">
                      <span className="font-medium text-ink">
                        {String(i + 1).padStart(2, "0")} {s.k}
                      </span>
                      <span className="mx-1 text-ink-4">·</span>
                      {s.d}
                    </p>
                  </li>
                ))}
              </ol>

              {/* 衔接：去看同源的交互演示 */}
              <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                <a
                  href={PAPER.pdf}
                  target="_blank"
                  rel="noreferrer"
                  className="cta-gradient focus-ring inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium"
                >
                  <FileText className="h-4 w-4" /> 阅读论文 PDF
                </a>
                <Link
                  href="/tools/med-seg-explainer"
                  className="surface focus-ring inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] text-ink-2 transition-colors hover:text-ink hover:border-[var(--line-strong)]"
                >
                  <span className="serif-italic">看同源的交互演示</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
