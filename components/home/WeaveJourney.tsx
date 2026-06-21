"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowUpRight, CornerDownLeft } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { CORE_FLOW, getTool } from "@/lib/tools-registry";
import { cn } from "@/lib/utils";

/**
 * 织线·旅程长卷 —— 首页核心论文流程的叙事呈现。
 *
 * 一条贯穿的「织线」（.weave-thread）串起 6 个左右交错的大站点：巨号斜体编号
 * + 二字动词 + 角色句 + 上下游流向 + 目标工具 chip。各站点用 <Reveal> 逐个
 * 点亮（stagger），造成织线随滚动向下延伸的观感。数据唯一来源是
 * lib/tools-registry 的 CORE_FLOW —— 不在此硬编码步骤。
 *
 * 响应式：lg 下站点沿中线左右交错；sm/md 下退化为单列、织线移到最左。
 */
export function WeaveJourney() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLSpanElement | null>(null);

  // 滚动进度：随旅程被滚过，彩色织线从顶端「织」到底端（scaleY，仅 transform）。
  // reduced-motion 下不挂监听，CSS 直接把 progress 视为 1（整条已织好）。
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
      // 0 → 旅程顶端刚到视口中线；1 → 底端越过中线。
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
      {/* 经线：一条贯穿全程的织线（静态轨）。mobile 靠左，lg 居中。 */}
      <span
        aria-hidden
        className="weave-thread pointer-events-none absolute top-2 bottom-10 left-[19px] w-px lg:left-1/2 lg:-translate-x-1/2"
      />
      {/* 彩色进度织线：随滚动 scaleY 增长，叠在静态轨上。 */}
      <span
        ref={progressRef}
        aria-hidden
        className="weave-thread-progress pointer-events-none absolute top-2 bottom-10 left-[19px] w-px lg:left-1/2 lg:-translate-x-1/2"
      />

      <ol className="relative space-y-7 lg:space-y-2">
        {CORE_FLOW.map((step, i) => {
          const tool = step.toolSlug ? getTool(step.toolSlug) : undefined;
          const target = tool?.name ?? "论文库";
          const left = i % 2 === 0; // 偶数索引（01/03/05）落在左侧
          const upstream = CORE_FLOW[i - 1]?.title;
          const downstream = CORE_FLOW[i + 1]?.title;

          return (
            <li key={step.title} className="relative">
              {/* 节点圆：坐落在织线上，与站点顶部对齐。 */}
              <span
                aria-hidden
                className="weave-node absolute top-7 left-[14px] z-10 lg:left-1/2 lg:-translate-x-1/2"
                style={{ ["--node" as string]: step.accent }}
              />

              <Reveal
                delay={i * 90}
                className={cn(
                  "pl-12 lg:pl-0",
                  "lg:w-[calc(50%-2.75rem)]",
                  left ? "lg:mr-auto" : "lg:ml-auto",
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
                  {/* 上游流向注脚 */}
                  <span
                    className={cn(
                      "overline flex items-center gap-1.5 text-ink-4",
                      left ? "lg:justify-end" : "lg:justify-start",
                    )}
                  >
                    {upstream ? `上游 · ${upstream}` : "链路起点"}
                  </span>

                  {/* 巨号 + 动词 */}
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

                  <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-ink-2 lg:ml-auto">
                    {step.blurb}
                  </p>

                  {/* 目标工具 chip + 下游流向 */}
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
            </li>
          );
        })}

        {/* 终点 cap：把「检索→…→制图→回存」闭环显性化。 */}
        <li className="relative">
          <span
            aria-hidden
            className="weave-node weave-node-end absolute top-7 left-[14px] z-10 lg:left-1/2 lg:-translate-x-1/2"
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
                产出<span className="serif-italic text-ink">回存</span>论文库，闭合检索—生成—回存回环
              </span>
            </Link>
          </Reveal>
        </li>
      </ol>
    </div>
  );
}
