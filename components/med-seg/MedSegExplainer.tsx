"use client";

import { useMemo, useState } from "react";
import { legacySamples } from "@/lib/med-seg/legacy-samples";
import type { StageId } from "@/lib/med-seg/types";
import { Hero } from "./Hero";
import { SampleGallery } from "./SampleGallery";
import { PredictionCompare } from "./PredictionCompare";
import { ArchitectureMap } from "./ArchitectureMap";
import { StageDetail } from "./StageDetail";
import { DWTPanel } from "./DWTPanel";
import { FWBlockDetail } from "./FWBlockDetail";
import { EAFFPanel } from "./EAFFPanel";
import { Article } from "./Article";

export function MedSegExplainer() {
  const [selectedId, setSelectedId] = useState(legacySamples[3].id);
  const [stageId, setStageId] = useState<StageId>("enc1");

  const sample = useMemo(
    () => legacySamples.find((s) => s.id === selectedId) ?? legacySamples[0],
    [selectedId],
  );

  const detail = stageDetailKind(stageId);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 pt-10 pb-20">
      <Hero />

      {/* Mobile fallback */}
      <div className="mt-10 rounded-2xl surface p-6 text-center lg:hidden">
        <p className="serif text-xl text-ink">
          <span className="serif-italic">Best on desktop.</span>
        </p>
        <p className="mt-2 text-sm text-ink-2">
          这个可视化在大屏上更舒展——请用宽度 ≥ 1024px 的浏览器打开。
        </p>
      </div>

      <div className="mt-10 hidden lg:block space-y-10">
        {/* Control bar: sample gallery */}
        <div
          className="rise-d flex flex-wrap items-center justify-between gap-4"
          style={{ animationDelay: "220ms" }}
        >
          <SampleGallery
            samples={legacySamples}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <div className="text-[11.5px] text-ink-3">
            ISIC 2018 val · 来自已训练 FWMamba checkpoint 的真实预测
          </div>
        </div>

        {/* Prediction compare row */}
        <div
          className="rise surface rounded-2xl p-6 border border-[var(--line)]"
          style={{ animationDelay: "300ms" }}
        >
          <PredictionCompare sample={sample} />
        </div>

        {/* Architecture map */}
        <div
          className="rise surface rounded-2xl p-6 border border-[var(--line)]"
          style={{ animationDelay: "380ms" }}
        >
          <div className="flex items-baseline justify-between">
            <div>
              <div className="overline" style={{ color: "#6b8ed6" }}>
                Architecture
              </div>
              <h2 className="serif text-[26px] text-ink mt-1">
                整条 U-Net 通路
              </h2>
            </div>
            <div className="text-[11.5px] text-ink-3">
              点击节点切换下方详情
            </div>
          </div>
          <div className="mt-4">
            <ArchitectureMap selected={stageId} onSelect={setStageId} />
          </div>
        </div>

        {/* Stage detail + related deep panel */}
        <div
          className="rise grid grid-cols-12 gap-6"
          style={{ animationDelay: "460ms" }}
        >
          <div className="col-span-12 xl:col-span-5 surface rounded-2xl p-6 border border-[var(--line)]">
            <StageDetail stageId={stageId} />
          </div>
          <div className="col-span-12 xl:col-span-7 surface rounded-2xl p-6 border border-[var(--line)]">
            {detail === "fwblock" && <FWBlockDetail />}
            {detail === "dwt" && <DWTPanel sampleId={selectedId} />}
            {detail === "eaff" && <EAFFPanel sample={sample} />}
          </div>
        </div>

        {/* Always-on deep dive sections */}
        <div
          className="rise surface rounded-2xl p-6 border border-[var(--line)]"
          style={{ animationDelay: "540ms" }}
        >
          <DWTPanel sampleId={selectedId} />
        </div>

        <div
          className="rise surface rounded-2xl p-6 border border-[var(--line)]"
          style={{ animationDelay: "620ms" }}
        >
          <EAFFPanel sample={sample} />
        </div>
      </div>

      <Article />
    </div>
  );
}

function stageDetailKind(id: StageId): "fwblock" | "dwt" | "eaff" {
  if (id === "dec2" || id === "dec3" || id === "dec4") return "eaff";
  if (id === "patch_embed" || id === "final") return "dwt";
  return "fwblock";
}
