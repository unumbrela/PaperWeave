"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowUpRight, CornerDownLeft } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { CORE_FLOW, getTool } from "@/lib/tools-registry";
import { cn } from "@/lib/utils";

/** 沿织线下落的「数据包」——少量彩色光点持续从上游流向下游，呼应一键流转。 */
const PARTICLES = [
  { p: "#b14bff", delay: "0s", dur: "6.5s" },
  { p: "#4bb3ff", delay: "1.6s", dur: "7.5s" },
  { p: "#f59e0b", delay: "3.1s", dur: "6s" },
  { p: "#ec4899", delay: "4.4s", dur: "8s" },
];

/**
 * 织线·旅程长卷 —— 首页核心论文流程的叙事呈现。
 *
 * 一条贯穿的「织线」（.weave-thread）串起 6 步：一侧是大站点（巨号 + 动词 +
 * 角色句 + 工具 chip），另一侧是「工序卡」（输入 → 产出，显性化"上游产出即下游
 * 输入"），两侧由节点 + 横向纬线（weft）织在中线上。动效：彩色数据包沿织线下落、
 * 节点涟漪、滚动织成进度线、站点逐个揭示。数据唯一来源是 lib/tools-registry 的
 * CORE_FLOW —— 不在此硬编码步骤。reduced-motion 下落点/涟漪/进度全部静止。
 */
export function WeaveJourney() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLSpanElement | null>(null);

  // 滚动进度：随旅程被滚过，彩色织线从顶端「织」到底端（scaleY，仅 transform）。
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const root = rootRef.current;
    const bar = progressRef.current;
    if (!root || !bar) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = root.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = (vh * 0.5 - rect.top) / Math.max(rect.height, 1);
      bar.style.setProperty("--progress", String(Math.min(1, Math.max(0, p))));
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      {/* 经线：静态轨。mobile 靠左，lg 居中。 */}
      <span
        aria-hidden
        className="weave-thread pointer-events-none absolute top-2 bottom-10 left-[19px] w-px lg:left-1/2 lg:-translate-x-1/2"
      />
      {/* 彩色进度织线：随滚动 scaleY 增长。 */}
      <span
        ref={progressRef}
        aria-hidden
        className="weave-thread-progress pointer-events-none absolute top-2 bottom-10 left-[19px] w-px lg:left-1/2 lg:-translate-x-1/2"
      />
      {/* 数据包：沿织线持续下落。 */}
      <div
        aria-hidden
        className="weave-flow pointer-events-none absolute top-2 bottom-10 left-[19px] w-px lg:left-1/2 lg:-translate-x-1/2"
      >
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="weave-particle"
            style={{
              ["--p" as string]: p.p,
              ["--delay" as string]: p.delay,
              ["--dur" as string]: p.dur,
            }}
          />
        ))}
      </div>

      <ol className="relative space-y-12 lg:space-y-0">
        {CORE_FLOW.map((step, i) => {
          const tool = step.toolSlug ? getTool(step.toolSlug) : undefined;
          const target = tool?.name ?? "论文库";
          const left = i % 2 === 0; // 偶数索引（01/03/05）站点落在左侧
          const upstream = CORE_FLOW[i - 1]?.title;
          const downstream = CORE_FLOW[i + 1]?.title;

          return (
            <li
              key={step.title}
              className="relative lg:grid lg:grid-cols-2 lg:items-center lg:gap-x-16 lg:py-7"
            >
              {/* 节点圆（含涟漪）坐落在织线上。 */}
              <span
                aria-hidden
                className="weave-node absolute top-7 left-[14px] z-10 lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2"
                style={{ ["--node" as string]: step.accent }}
              />
              {/* 纬线：横穿节点的一道细线，与经线织成十字。 */}
              <span
                aria-hidden
                className="weave-weft pointer-events-none absolute top-1/2 left-1/2 hidden h-px w-28 -translate-x-1/2 -translate-y-1/2 lg:block"
                style={{ ["--accent" as string]: step.accent }}
              />

              {/* 站点（一侧） */}
              <Reveal
                delay={i * 90}
                className={cn(
                  "pl-12 lg:pl-0 lg:row-start-1",
                  left ? "lg:col-start-1" : "lg:col-start-2",
                )}
              >
                <Link
                  href={step.href}
                  className={cn(
                    "weave-station sheen group focus-ring relative block rounded-[22px] p-6 sm:p-7",
                    left ? "lg:text-right" : "lg:text-left",
                  )}
                  style={{ ["--accent" as string]: step.accent }}
                >
                  <span
                    className={cn(
                      "overline flex items-center gap-1.5 text-ink-4",
                      left ? "lg:justify-end" : "lg:justify-start",
                    )}
                  >
                    {upstream ? `上游 · ${upstream}` : "链路起点"}
                  </span>

                  <div
                    className={cn(
                      "mt-3 flex items-baseline gap-4",
                      left ? "lg:flex-row-reverse" : "lg:flex-row",
                    )}
                  >
                    <span
                      className="numeral text-[58px] leading-none sm:text-[68px]"
                      style={{ color: step.accent }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="serif text-[34px] leading-none tracking-tight text-ink sm:text-[40px]">
                      {step.title}
                    </h3>
                    <span aria-hidden className="text-[22px] leading-none">
                      {step.icon}
                    </span>
                  </div>

                  <p
                    className={cn(
                      "mt-4 max-w-md text-[13.5px] leading-relaxed text-ink-2",
                      left ? "lg:ml-auto" : "",
                    )}
                  >
                    {step.blurb}
                  </p>

                  <div
                    className={cn(
                      "mt-6 flex items-center gap-4",
                      left ? "lg:flex-row-reverse" : "lg:flex-row",
                    )}
                  >
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] text-ink-2 transition-colors group-hover:text-ink"
                      style={{ borderColor: "var(--line-strong)" }}
                    >
                      打开
                      <span className="serif-italic text-ink">{target}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                    <span className="overline text-ink-4">
                      {downstream ? `下游 · ${downstream}` : "回存论文库"}
                    </span>
                  </div>
                </Link>
              </Reveal>

              {/* 工序卡：输入 → 产出（另一侧，填补留白 + 显性化流水线） */}
              <Reveal
                delay={i * 90 + 70}
                className={cn(
                  "mt-4 pl-12 lg:mt-0 lg:pl-0 lg:row-start-1",
                  left ? "lg:col-start-2" : "lg:col-start-1",
                )}
              >
                <div
                  className={cn(
                    "flow-panel group/panel relative overflow-hidden rounded-[20px] p-6 sm:p-7",
                    "max-w-sm",
                    left ? "" : "lg:ml-auto",
                  )}
                  style={{ ["--accent" as string]: step.accent }}
                >
                  {/* 顶部 accent 细条 + 大字水印 */}
                  <span aria-hidden className="flow-rail" />
                  <span aria-hidden className="flow-glyph">
                    {step.icon}
                  </span>

                  {/* 工序标识 */}
                  <div className="relative flex items-center justify-between">
                    <span className="overline text-ink-4">工序 / Pipeline</span>
                    <span
                      className="numeral text-[20px] leading-none opacity-70"
                      style={{ color: step.accent }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  {/* 输入 → 产出 管线（节点圆 + 竖线） */}
                  <div className="relative mt-5 pl-6">
                    {/* 竖线 */}
                    <span
                      aria-hidden
                      className="absolute left-[5px] top-2 bottom-2 w-px"
                      style={{
                        background: `linear-gradient(180deg, var(--line-strong), ${step.accent})`,
                      }}
                    />
                    {/* 输入节点 */}
                    <div className="relative">
                      <span
                        aria-hidden
                        className="absolute -left-6 top-1 h-[11px] w-[11px] rounded-full border-2 bg-paper"
                        style={{ borderColor: "var(--line-strong)" }}
                      />
                      <div className="overline text-ink-4">输入</div>
                      <div className="mt-0.5 text-[14px] text-ink-2">
                        {step.input}
                      </div>
                    </div>
                    {/* 产出节点 */}
                    <div className="relative mt-4">
                      <span
                        aria-hidden
                        className="flow-dot absolute -left-6 top-1 h-[11px] w-[11px] rounded-full"
                        style={{ background: step.accent }}
                      />
                      <div className="overline" style={{ color: step.accent }}>
                        产出
                      </div>
                      <div
                        className="mt-1 inline-flex items-center rounded-lg px-2.5 py-1 text-[14px] font-medium text-ink"
                        style={{
                          background: `color-mix(in srgb, ${step.accent} 12%, transparent)`,
                        }}
                      >
                        {step.output}
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </li>
          );
        })}

        {/* 终点 cap：把「检索→…→制图→回存」闭环显性化（与上一行拉开间距防重叠）。 */}
        <li className="relative pt-40 lg:pt-48">
          <span
            aria-hidden
            className="weave-node weave-node-end absolute top-[180px] left-[14px] z-10 lg:left-1/2 lg:-translate-x-1/2 lg:top-[204px]"
          />
          <Reveal
            delay={CORE_FLOW.length * 90}
            className="pl-12 lg:pl-0 lg:flex lg:justify-center"
          >
            <Link
              href="/library"
              className="surface focus-ring group inline-flex items-center gap-2.5 rounded-full px-5 py-3 transition-colors hover:border-[var(--line-strong)]"
            >
              <CornerDownLeft className="h-4 w-4 text-ink-3 transition-colors group-hover:text-coral" />
              <span className="text-[13px] text-ink-2 group-hover:text-ink">
                产出<span className="font-medium text-ink">回存</span>论文库，闭合检索—生成—回存回环
              </span>
            </Link>
          </Reveal>
        </li>
      </ol>
    </div>
  );
}
