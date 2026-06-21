"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Vec2 } from "@/lib/diffusion-explainer/types";
import {
  CANVAS_SIZE,
  DOMAIN_MAX,
  DOMAIN_MIN,
  FIELD_COLOR,
  SOURCE_COLOR,
  TARGET_COLOR,
} from "@/lib/diffusion-explainer/config";
import {
  clearCanvas,
  dataToPx,
  drawArrow,
  drawAxes,
  drawPoints,
  setupHiDPICanvas,
  withAlpha,
} from "@/lib/diffusion-explainer/draw-utils";
import { velocityField } from "@/lib/diffusion-explainer/flow";
import { mulberry32 } from "@/lib/diffusion-explainer/rng";

/** 沿时间 t 看插值边缘 p_t 从源演化到数据，并叠加边缘速度场。 */
export function ProbabilityPathFigure({ data, source }: { data: Vec2[]; source: Vec2[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [t, setT] = useState(0.5);
  const [showField, setShowField] = useState(true);

  // 独立耦合：每个源点固定配一个随机目标点
  const pairs = useMemo<[Vec2, Vec2][]>(() => {
    const rng = mulberry32(17);
    return source.map((z) => [z, data[Math.floor(rng() * Math.max(1, data.length))] ?? [0, 0]]);
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

    // 速度场箭头
    if (showField && data.length) {
      const field = velocityField(data, t, 11, DOMAIN_MIN + 0.4, DOMAIN_MAX - 0.4);
      const scale = 0.06;
      for (const { x, v } of field) {
        const to: Vec2 = [x[0] + v[0] * scale, x[1] + v[1] * scale];
        drawArrow(ctx, x, to, w, h, FIELD_COLOR, 0.5);
      }
    }

    // 当前 X_t 点云
    const cloud = pairs.map(
      ([z, x1]) => [(1 - t) * z[0] + t * x1[0], (1 - t) * z[1] + t * x1[1]] as Vec2,
    );
    const color = t < 0.5 ? SOURCE_COLOR : TARGET_COLOR;
    drawPoints(ctx, cloud, w, h, withAlpha(color, 0.8), 2);
  }, [t, showField, pairs, data]);

  return (
    <figure className="rise surface rounded-2xl border border-[var(--line)] p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-ink-3">
          边缘分布 p_t · <span className="text-ink-2 font-medium">t = {t.toFixed(2)}</span>
        </span>
        <label className="flex items-center gap-2 text-xs text-ink-3 cursor-pointer">
          <input type="checkbox" checked={showField} onChange={(e) => setShowField(e.target.checked)} />
          速度场
        </label>
      </div>
      <canvas ref={canvasRef} className="w-full mx-auto rounded-lg border border-[var(--line)]" />
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={t}
        onChange={(e) => setT(Number(e.target.value))}
        className="w-full accent-[#8b5cf6] mt-3"
      />
      <div className="flex justify-between text-[11px] text-ink-4 mt-1">
        <span style={{ color: SOURCE_COLOR }}>t=0 · 源 N(0,I)</span>
        <span style={{ color: TARGET_COLOR }}>t=1 · 数据</span>
      </div>
      <figcaption className="mt-2 text-[11px] text-ink-4 text-center">
        拖动 t：Xₜ=(1−t)X₀+tX₁ 把高斯连续搬向数据；粉色箭头是网络要学的边缘速度场 vₜ(x)
      </figcaption>
    </figure>
  );
}
