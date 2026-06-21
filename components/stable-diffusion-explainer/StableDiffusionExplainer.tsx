"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

const ACCENT = "#ec4899";
const EMBED_SRC = "/diffusion-sd/index.html";

export function StableDiffusionExplainer() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 pt-10 pb-20">
      {/* Hero */}
      <div>
        <div
          className="rise-d flex items-center gap-2 text-[12px]"
          style={{ animationDelay: "40ms" }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-ink-3 hover:text-ink transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="overline text-[11px]">返回 · THE COLLECTION</span>
          </Link>
        </div>

        <header
          className="rise mt-6 grid grid-cols-12 items-end gap-6"
          style={{ animationDelay: "120ms" }}
        >
          <div className="col-span-12 lg:col-span-9">
            <div className="overline mb-3" style={{ color: ACCENT }}>
              展厅 · 学习
            </div>
            <h1 className="serif text-[44px] sm:text-[60px] leading-[0.96] tracking-[-0.025em] text-ink">
              <span className="serif-italic text-ink-2">Stable Diffusion</span>
              <span className="ml-3">文生图讲解</span>
            </h1>
            <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-ink-2">
              从一句{" "}
              <span className="serif-italic text-ink">prompt</span>{" "}
              到一张图：看文本如何被 CLIP 编码、噪声如何被 UNet
              逐步去除、引导强度与随机种子如何改变结果。拖动时间步、切换
              guidance，亲手观察图像从噪声里浮现。
            </p>
          </div>
          <div className="col-span-12 lg:col-span-3 lg:text-right">
            <div className="hairline mb-3 lg:ml-auto lg:w-24" />
            <div className="overline">Based on</div>
            <div className="serif text-[18px] mt-1 text-ink leading-tight">
              Diffusion{" "}
              <span className="serif-italic">Explainer</span>
              <div className="mt-1 text-[11px] text-ink-3 font-normal tracking-normal">
                Lee et&nbsp;al. · Polo Club, Georgia Tech · MIT
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-1 text-[11px] lg:items-end">
              <a
                href="https://github.com/poloclub/diffusion-explainer"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-ink-3 hover:text-ink transition-colors"
              >
                源码 <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://arxiv.org/abs/2305.03509"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-ink-3 hover:text-ink transition-colors"
              >
                论文 arXiv:2305.03509 <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </header>

        <div className="hairline mt-10" />
      </div>

      {/* Mobile fallback */}
      <div className="mt-10 rounded-2xl surface p-6 text-center lg:hidden">
        <p className="serif text-xl text-ink">
          <span className="serif-italic">Best on desktop.</span>
        </p>
        <p className="mt-2 text-sm text-ink-2">
          这个交互可视化为宽屏设计——请用宽度 ≥ 1024px 的浏览器打开以获得完整体验。
        </p>
        <a
          href={EMBED_SRC}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-[13px]"
          style={{ color: ACCENT }}
        >
          在新标签打开 <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Desktop embed */}
      <div className="mt-10 hidden lg:block">
        <div
          className="rise-d flex items-center justify-between gap-4 mb-3"
          style={{ animationDelay: "200ms" }}
        >
          <span className="text-[12px] text-ink-3">
            交互演示在下方画布中运行（深色为原作界面）。
          </span>
          <a
            href={EMBED_SRC}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink transition-colors"
          >
            在新标签打开完整页 <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <div
          className="rise-d overflow-hidden rounded-2xl surface"
          style={{ animationDelay: "260ms" }}
        >
          <iframe
            src={EMBED_SRC}
            title="Stable Diffusion 文生图讲解"
            className="block w-full"
            style={{ height: "1500px", border: "0" }}
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
