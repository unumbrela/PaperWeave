"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ACCENT } from "@/lib/transformer-explainer/config";

export function Hero() {
  return (
    <>
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
          <span className="serif-italic text-ink-2">Transformer</span>
          <span className="ml-3">是怎么预测下一个词的</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          给它一句话，它会输出「最可能的下一个词」。下面把这条路径
          <span className="text-ink">从分词、嵌入、注意力，一路拆到最终的概率</span>，
          每一步都配一张能动手的图——同一句话<em>一路往下流</em>，看它如何被算成一个预测。
        </p>
      </header>
    </>
  );
}
