"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CouplingType, Vec2 } from "@/lib/diffusion-explainer/types";
import {
  CANVAS_SIZE,
  CURVED_COLOR,
  SOURCE_COLOR,
  STRAIGHT_COLOR,
  TARGET_COLOR,
} from "@/lib/diffusion-explainer/config";
import {
  clearCanvas,
  dataToPx,
  drawAxes,
  drawPath,
  drawPoints,
  setupHiDPICanvas,
} from "@/lib/diffusion-explainer/draw-utils";
import { countCrossings, flowEndpoint } from "@/lib/diffusion-explainer/flow";
import { mulberry32 } from "@/lib/diffusion-explainer/rng";

/** 对比独立耦合（连线大量交叉）与重流诱导耦合（几乎不交叉）。 */
export function CouplingFigure({ data, source }: { data: Vec2[]; source: Vec2[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [type, setType] = useState<CouplingType>("independent");

  const pairs = useMemo(() => {
    const rng = mulberry32(31);
    const indep = source.map((z) => ({
      a: z,
      b: data[Math.floor(rng() * Math.max(1, data.length))] ?? ([0, 0] as Vec2),
    }));
    const rect = source.map((z) => ({ a: z, b: flowEndpoint(z, data) }));
    return {
      independent: { pairs: indep, crossings: countCrossings(indep) },
      rectified: { pairs: rect, crossings: countCrossings(rect) },
    };
  }, [source, data]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const { ctx } = setupHiDPICanvas(c, CANVAS_SIZE);
    ctxRef.current = ctx;
  }, []);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const w = CANVAS_SIZE;
    const h = CANVAS_SIZE;
    clearCanvas(ctx, w, h);
    drawAxes(ctx, w, h);
    const cur = pairs[type];
    const color = type === "independent" ? CURVED_COLOR : STRAIGHT_COLOR;
    for (const p of cur.pairs) drawPath(ctx, [p.a, p.b], w, h, color, 0.5, 1);
    drawPoints(ctx, cur.pairs.map((p) => p.a), w, h, SOURCE_COLOR, 3);
    drawPoints(ctx, cur.pairs.map((p) => p.b), w, h, TARGET_COLOR, 3);
  }, [type, pairs]);

  return (
    <figure className="rise surface rounded-2xl border border-[var(--line)] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {(["independent", "rectified"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setType(c)}
              className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                type === c
                  ? "bg-[#8b5cf6] text-white"
                  : "bg-surface border border-[var(--line)] text-ink-3 hover:border-[#8b5cf6]"
              }`}
            >
              {c === "independent" ? "独立耦合" : "重流耦合"}
            </button>
          ))}
        </div>
        <span className="text-xs text-ink-3">
          交叉对数：<span className="font-medium text-ink-2">{pairs[type].crossings}</span>
        </span>
      </div>
      <canvas ref={canvasRef} className="w-full mx-auto rounded-lg border border-[var(--line)]" />
      <figcaption className="mt-2 text-[11px] text-ink-4 text-center">
        独立耦合随机配对 → 连线大量交叉 → 交叉点速度被平均 → 轨迹弯曲；重流用模型自己的终点配对 → 几乎不交叉
      </figcaption>
    </figure>
  );
}
