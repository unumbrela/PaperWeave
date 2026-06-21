"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DenoisePlayer } from "./DenoisePlayer";
import { KeywordCompare } from "./KeywordCompare";
import { ForwardNoise } from "./ForwardNoise";
import { Article } from "./Article";
import { References } from "./References";

const ACCENT = "#ec4899";

export function StableDiffusionExplainer() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 pt-10 pb-20">
      {/* Hero */}
      <div className="rise-d flex items-center gap-2 text-[12px]" style={{ animationDelay: "40ms" }}>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-ink-3 hover:text-ink transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="overline text-[11px]">返回 · THE COLLECTION</span>
        </Link>
      </div>

      <header className="rise mt-6" style={{ animationDelay: "120ms" }}>
        <div className="overline mb-3" style={{ color: ACCENT }}>
          展厅 · 学习
        </div>
        <h1 className="serif text-[44px] sm:text-[60px] leading-[0.96] tracking-[-0.025em] text-ink">
          <span className="serif-italic text-ink-2">Stable Diffusion</span>
          <span className="ml-3">是怎么画画的</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          一句话变成一张图，靠的不是「凭空创作」，而是
          <span className="text-ink">从一团噪声里，一步步把图擦出来</span>。
          下面三个小互动，分别让你亲手体验<em>反向去噪</em>、<em>文字的牵引</em>与<em>前向加噪</em>，
          再配合讲解，把扩散模型彻底搞懂。
        </p>
      </header>

      <div className="hairline mt-10" />

      {/* 移动端兜底 */}
      <div className="mt-10 rounded-2xl surface p-6 text-center lg:hidden">
        <p className="serif text-xl text-ink">
          <span className="serif-italic">Best on desktop.</span>
        </p>
        <p className="mt-2 text-sm text-ink-2">
          交互演示为宽屏设计——请用宽度 ≥ 1024px 的浏览器打开以获得完整体验。下方讲解可正常阅读。
        </p>
      </div>

      {/* 交互区（桌面） */}
      <div className="mt-10 hidden flex-col gap-8 lg:flex">
        <DenoisePlayer />
        <KeywordCompare />
        <ForwardNoise />
      </div>

      {/* 讲解 + 参考文献（移动端也可读） */}
      <Article />
      <References />
    </div>
  );
}
