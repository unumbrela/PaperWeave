"use client";

import { useState, useEffect } from "react";
import { Hero } from "./Hero";
import { Overview } from "./Overview";
import { TimestepSelector } from "./TimestepSelector";
import { NoiseScheduler } from "./NoiseScheduler";
import { Article } from "./Article";
import { DiffusionVisualizer } from "./DiffusionVisualizer";
import { UNetArchitecture } from "./UNetArchitecture";
import { constructDiffusion } from "@/lib/diffusion-explainer/diffusion-model";
import { Diffusion } from "@/lib/diffusion-explainer/types";

export default function DiffusionExplainer() {
  const [diffusion, setDiffusion] = useState<Diffusion | null>(null);
  const [rangeType, setRangeType] = useState<"local" | "module" | "global">("global");
  const [detailedMode, setDetailedMode] = useState(false);
  const [currentTimestep, setCurrentTimestep] = useState(50);

  useEffect(() => {
    const newDiffusion = constructDiffusion();
    setDiffusion(newDiffusion);
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <Hero />
      
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRangeType("local")}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              rangeType === "local"
                ? "bg-[#22c55e] text-white"
                : "bg-surface border border-[var(--line)] text-ink-2 hover:border-[#22c55e]"
            }`}
          >
            Local
          </button>
          <button
            onClick={() => setRangeType("module")}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              rangeType === "module"
                ? "bg-[#22c55e] text-white"
                : "bg-surface border border-[var(--line)] text-ink-2 hover:border-[#22c55e]"
            }`}
          >
            Module
          </button>
          <button
            onClick={() => setRangeType("global")}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              rangeType === "global"
                ? "bg-[#22c55e] text-white"
                : "bg-surface border border-[var(--line)] text-ink-2 hover:border-[#22c55e]"
            }`}
          >
            Global
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-3">详细模式</span>
          <button
            onClick={() => setDetailedMode(!detailedMode)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              detailedMode ? "bg-[#22c55e]" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                detailedMode ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        <DiffusionVisualizer />
        
        <UNetArchitecture currentTimestep={currentTimestep} />
        
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Overview 
              diffusion={diffusion} 
              rangeType={rangeType} 
              detailedMode={detailedMode} 
            />
          </div>
          
          <div className="space-y-6">
            <TimestepSelector 
              currentTimestep={currentTimestep} 
              onTimestepChange={setCurrentTimestep} 
            />
            <NoiseScheduler currentTimestep={currentTimestep} />
          </div>
        </div>
      </div>

      <Article />
    </div>
  );
}