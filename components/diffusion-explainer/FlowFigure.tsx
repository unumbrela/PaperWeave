"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FlowMode, Vec2 } from "@/lib/diffusion-explainer/types";
import {
  CANVAS_SIZE,
  CURVED_COLOR,
  FINE_STEPS,
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
  withAlpha,
} from "@/lib/diffusion-explainer/draw-utils";
import { buildTrajectories } from "@/lib/diffusion-explainer/flow";

/**
 * 流的轨迹动画：源高斯 → 目标数据。
 * mode = curved（flow matching 弯曲路径）/ rectified（拉直）/ both（叠加对比）。
 */
export function FlowFigure({
  data,
  source,
  mode,
  caption,
  height = CANVAS_SIZE,
}: {
  data: Vec2[];
  source: Vec2[];
  mode: FlowMode | "both";
  caption?: string;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const progRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [running, setRunning] = useState(false);

  const trajs = useMemo(() => buildTrajectories(source, data, FINE_STEPS), [source, data]);

  const draw = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const w = CANVAS_SIZE;
    const h = CANVAS_SIZE;
    clearCanvas(ctx, w, h);
    drawAxes(ctx, w, h);

    // 源与目标点云（淡）
    drawPoints(ctx, source, w, h, withAlpha(SOURCE_COLOR, 0.25), 1.6);
    drawPoints(ctx, data, w, h, withAlpha(TARGET_COLOR, 0.5), 1.6);

    const p = progRef.current;
    const idx = Math.round(p * FINE_STEPS);
    const showCurved = mode === "curved" || mode === "both";
    const showRect = mode === "rectified" || mode === "both";

    if (showCurved) {
      for (const tr of trajs.curved) drawPath(ctx, tr.slice(0, idx + 1), w, h, CURVED_COLOR, 0.35);
    }
    if (showRect) {
      for (const tr of trajs.rect) drawPath(ctx, tr.slice(0, idx + 1), w, h, STRAIGHT_COLOR, 0.35);
    }

    // 运动中的粒子头
    const drawHeads = (list: Vec2[][], color: string) => {
      ctx.fillStyle = color;
      for (const tr of list) {
        const pt = tr[Math.min(idx, tr.length - 1)];
        const [px, py] = dataToPx(pt, w, h);
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    if (showCurved) drawHeads(trajs.curved, CURVED_COLOR);
    if (showRect) drawHeads(trajs.rect, STRAIGHT_COLOR);
  };

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const { ctx } = setupHiDPICanvas(c, CANVAS_SIZE);
    ctxRef.current = ctx;
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 数据/模式变化 → 重绘
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trajs, mode]);

  useEffect(() => {
    if (!running) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    if (progRef.current >= 1) progRef.current = 0;
    const loop = () => {
      progRef.current = Math.min(1, progRef.current + 1 / 90);
      draw();
      if (progRef.current >= 1) {
        rafRef.current = null;
        setRunning(false);
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const reset = () => {
    setRunning(false);
    progRef.current = 0;
    draw();
  };

  return (
    <figure className="rise surface rounded-2xl border border-[var(--line)] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 text-xs text-ink-3">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: SOURCE_COLOR }} />源 N(0,I)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: TARGET_COLOR }} />数据
          </span>
          {(mode === "curved" || mode === "both") && (
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-0.5" style={{ background: CURVED_COLOR }} />曲线流
            </span>
          )}
          {(mode === "rectified" || mode === "both") && (
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-0.5" style={{ background: STRAIGHT_COLOR }} />拉直流
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setRunning((r) => !r)}
            className={`px-3 py-1.5 rounded-lg text-xs text-white ${
              running ? "bg-red-500 hover:bg-red-600" : "bg-[#8b5cf6] hover:bg-purple-700"
            }`}
          >
            {running ? "⏸ 暂停" : "▶ 播放"}
          </button>
          <button
            onClick={reset}
            className="px-3 py-1.5 rounded-lg text-xs bg-surface border border-[var(--line)] text-ink-2 hover:border-[#8b5cf6]"
          >
            🔄
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        style={{ maxWidth: height }}
        className="w-full mx-auto rounded-lg border border-[var(--line)]"
      />
      {caption && <figcaption className="mt-2 text-[11px] text-ink-4 text-center">{caption}</figcaption>}
    </figure>
  );
}
