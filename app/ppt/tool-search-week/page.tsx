import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ToolSearchWeekChart } from "@/components/ppt/tool-search-week-chart";

export const metadata: Metadata = {
  title: "PPT 引入柱状图 · Toolbox",
  description:
    "用于 PPT 引入部分的一周搜索行为柱状图：基于重新设计的一周波动数据，用 Python 绘制堆叠柱状图。",
};

export default function Page() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-16 pb-24">
      <div className="rise-d" style={{ animationDelay: "40ms" }}>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[12px] text-ink-3 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="mono tracking-[0.14em] uppercase">All tools</span>
        </Link>
      </div>

      <header className="mt-10 grid grid-cols-12 gap-6 items-end">
        <div className="col-span-12 lg:col-span-8">
          <div className="overline">PPT Intro Chart</div>
          <h1 className="mt-4 serif text-[48px] leading-[0.95] tracking-[-0.03em] text-ink sm:text-[72px] lg:text-[88px]">
            一周搜索行为
            <br />
            <span className="serif-italic text-ink-2">Bar Chart</span>
          </h1>
        </div>

        <div className="col-span-12 lg:col-span-4 lg:pb-3">
          <div className="hairline mb-4" />
          <p className="max-w-sm text-[13px] leading-relaxed text-ink-2">
            这页专门用于你的项目引入 PPT。图表由 Python 生成；下方保留这组重新设计后的
            7 天数据，方便你核对。
          </p>
        </div>
      </header>

      <div className="mt-10 hairline" />

      <div className="mt-10">
        <ToolSearchWeekChart />
      </div>
    </section>
  );
}
