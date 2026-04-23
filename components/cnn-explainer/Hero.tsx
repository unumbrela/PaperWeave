import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function Hero() {
  return (
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
          <div className="overline mb-3" style={{ color: "#f4c25a" }}>
            学习 · 工具
          </div>
          <h1 className="serif text-[44px] sm:text-[60px] leading-[0.96] tracking-[-0.025em] text-ink">
            <span className="serif-italic text-ink-2">CNN</span>
            <span className="ml-3">可视化</span>
          </h1>
          <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-ink-2">
            把{" "}
            <span className="serif-italic text-ink">tiny-VGG</span>{" "}
            搬进浏览器——一层层看像素如何被抽象成 feature map，最后落到 10 类之一。
            鼠标放到任意节点，数据就流了起来。
          </p>
        </div>
        <div className="col-span-12 lg:col-span-3 lg:text-right">
          <div className="hairline mb-3 lg:ml-auto lg:w-24" />
          <div className="overline">Based on</div>
          <div className="serif text-[18px] mt-1 text-ink leading-tight">
            CNN{" "}
            <span className="serif-italic">Explainer</span>
            <div className="mt-1 text-[11px] text-ink-3 font-normal tracking-normal">
              Wang et&nbsp;al. · Georgia Tech
            </div>
          </div>
        </div>
      </header>

      <div className="hairline mt-10" />
    </div>
  );
}
