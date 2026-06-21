"use client";

import { useEffect, useMemo, useState } from "react";
import { legacySamples } from "@/lib/med-seg/legacy-samples";
import { FLOW_STEPS } from "@/lib/med-seg/flow-stages";
import { Hero } from "./Hero";
import { SampleGallery } from "./SampleGallery";
import { Pipeline } from "./Pipeline";
import { FlowDetail } from "./FlowDetail";
import { Article } from "./Article";

export function MedSegExplainer() {
  const [selectedId, setSelectedId] = useState(legacySamples[5].id); // s500，Dice 最高
  const [activeIndex, setActiveIndex] = useState(0);

  const sample = useMemo(
    () => legacySamples.find((s) => s.id === selectedId) ?? legacySamples[0],
    [selectedId],
  );

  const step = FLOW_STEPS[activeIndex];

  // 空闲时预取相邻样本的图，切换样本更顺滑
  useEffect(() => {
    const idx = legacySamples.findIndex((s) => s.id === selectedId);
    const neighbors = [legacySamples[idx - 1], legacySamples[idx + 1]].filter(
      Boolean,
    );
    const preload = () => {
      for (const s of neighbors) {
        for (const src of [s.input, s.overlay, s.thumb]) {
          const img = new window.Image();
          img.src = src;
        }
      }
    };
    const ric =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(preload)
        : window.setTimeout(preload, 200);
    return () => {
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(ric as number);
      } else {
        clearTimeout(ric as number);
      }
    };
  }, [selectedId]);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 pt-10 pb-20">
      <Hero />

      {/* Mobile fallback */}
      <div className="mt-10 rounded-2xl surface p-6 text-center lg:hidden">
        <p className="serif text-xl text-ink">
          <span className="serif-italic">Best on desktop.</span>
        </p>
        <p className="mt-2 text-sm text-ink-2">
          这个流水线在大屏上更舒展——请用宽度 ≥ 1024px 的浏览器打开。
        </p>
      </div>

      <div className="mt-10 hidden lg:block space-y-8">
        {/* 控制条：样本选择 */}
        <div
          className="rise-d flex flex-wrap items-center justify-between gap-4"
          style={{ animationDelay: "220ms" }}
        >
          <SampleGallery
            samples={legacySamples}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              // 切样本时把流水线拉回到开头
              setActiveIndex(0);
            }}
          />
          <div className="text-[11.5px] text-ink-3">
            ISIC 2018 val · 已训练 FWMamba checkpoint 的真实预测 · Dice{" "}
            <span className="font-mono text-ink-2 tabular-nums">
              {sample.dice.toFixed(3)}
            </span>
          </div>
        </div>

        {/* Pipeline 主画布 */}
        <div
          className="rise surface rounded-2xl p-6 border border-[var(--line)]"
          style={{ animationDelay: "300ms" }}
        >
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <div className="overline" style={{ color: "#6b8ed6" }}>
                End-to-end flow
              </div>
              <h2 className="serif text-[26px] text-ink mt-1">
                一张图如何变成一张掩膜
              </h2>
            </div>
            <div className="text-[11.5px] text-ink-3 max-w-xs text-right leading-relaxed">
              从左到右依次经过 Patch Embed → 三级编码器 → 瓶颈 → 三级解码器 → Final。橙色虚线弧是 EAFF-Skip。
            </div>
          </div>

          <Pipeline
            sample={sample}
            activeIndex={activeIndex}
            onActiveChange={setActiveIndex}
          />
        </div>

        {/* 当前 stage 的详细视图 */}
        <div
          key={step.id}
          className="card-emerge surface rounded-2xl p-6 border border-[var(--line)]"
        >
          <FlowDetail step={step} sample={sample} />
        </div>
      </div>

      <Article />
    </div>
  );
}
