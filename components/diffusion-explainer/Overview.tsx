"use client";

import { useEffect, useRef } from "react";
import { Diffusion } from "@/lib/diffusion-explainer/types";
import { drawDiffusion } from "@/lib/diffusion-explainer/overview-draw";

interface OverviewProps {
  diffusion: Diffusion | null;
  rangeType: "local" | "module" | "global";
  detailedMode: boolean;
}

export function Overview({ diffusion, rangeType, detailedMode }: OverviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && diffusion) {
      drawDiffusion(containerRef.current, diffusion, rangeType, detailedMode);
    }
  }, [diffusion, rangeType, detailedMode]);

  if (!diffusion) {
    return (
      <div className="rise surface rounded-2xl overflow-hidden border border-[var(--line)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="serif text-lg text-ink">扩散过程可视化</h3>
          <div className="flex items-center gap-2 text-xs text-ink-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#667eea]" />
              噪声
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
              去噪
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#f4c25a]" />
              输出
            </span>
          </div>
        </div>
        <div className="w-full h-64 md:h-80 lg:h-96 flex items-center justify-center bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
            <span className="text-ink-3">加载中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rise surface rounded-2xl overflow-hidden border border-[var(--line)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="serif text-lg text-ink">扩散过程可视化</h3>
        <div className="flex items-center gap-2 text-xs text-ink-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#667eea]" />
            噪声
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
            去噪
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#f4c25a]" />
            输出
          </span>
        </div>
      </div>
      <div 
        ref={containerRef} 
        className="w-full h-64 md:h-80 lg:h-96"
      />
    </div>
  );
}