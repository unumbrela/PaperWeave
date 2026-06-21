"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Vec2 } from "@/lib/diffusion-explainer/types";
import {
  CANVAS_SIZE,
  CURVED_COLOR,
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
import {
  eulerTrajectory,
  flowEndpoint,
  rectifiedTrajectory,
} from "@/lib/diffusion-explainer/flow";

const SIZE = Math.round(CANVAS_SIZE * 0.86);

function meanErr(ends: Vec2[], truth: Vec2[]): number {
  let s = 0;
  for (let i = 0; i < ends.length; i++) s += Math.hypot(ends[i][0] - truth[i][0], ends[i][1] - truth[i][1]);
  return s / Math.max(1, ends.length);
}

/** 少步采样对比：曲线流用 k 步 Euler 会跑偏，rectified 直线流 1 步即精确。 */
export function FewStepFigure({ data, source }: { data: Vec2[]; source: Vec2[] }) {
  const curvedRef = useRef<HTMLCanvasElement | null>(null);
  const rectRef = useRef<HTMLCanvasElement | null>(null);
  const cCtx = useRef<CanvasRenderingContext2D | null>(null);
  const rCtx = useRef<CanvasRenderingContext2D | null>(null);
  const [k, setK] = useState(1);
  const [err, setErr] = useState({ curved: 0, rect: 0 });

  const trueEnds = useMemo(() => source.map((z) => flowEndpoint(z, data)), [source, data]);

  useEffect(() => {
    if (curvedRef.current) cCtx.current = setupHiDPICanvas(curvedRef.current, SIZE).ctx;
    if (rectRef.current) rCtx.current = setupHiDPICanvas(rectRef.current, SIZE).ctx;
  }, []);

  useEffect(() => {
    const cc = cCtx.current;
    const rc = rCtx.current;
    if (!cc || !rc) return;

    const eulerTrajs = source.map((z) => eulerTrajectory(z, data, k));
    const rectTrajs = source.map((z, i) => rectifiedTrajectory(z, data, k, trueEnds[i]));
    const curvedEnds = eulerTrajs.map((tr) => tr[tr.length - 1]);
    const rectEnds = rectTrajs.map((tr) => tr[tr.length - 1]);
    setErr({ curved: meanErr(curvedEnds, trueEnds), rect: meanErr(rectEnds, trueEnds) });

    const paint = (
      ctx: CanvasRenderingContext2D,
      trajs: Vec2[][],
      ends: Vec2[],
      color: string,
    ) => {
      clearCanvas(ctx, SIZE, SIZE);
      drawAxes(ctx, SIZE, SIZE);
      drawPoints(ctx, data, SIZE, SIZE, withAlpha(TARGET_COLOR, 0.4), 1.4);
      for (const tr of trajs) drawPath(ctx, tr, SIZE, SIZE, color, 0.3, 1);
      drawPoints(ctx, ends, SIZE, SIZE, color, 2.4);
    };
    paint(cc, eulerTrajs, curvedEnds, CURVED_COLOR);
    paint(rc, rectTrajs, rectEnds, STRAIGHT_COLOR);
  }, [k, source, data, trueEnds]);

  return (
    <figure className="rise surface rounded-2xl border border-[var(--line)] p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-ink-3">
          Euler 步数 k = <span className="font-medium text-ink-2">{k}</span>
        </span>
        <input
          type="range"
          min={1}
          max={16}
          step={1}
          value={k}
          onChange={(e) => setK(Number(e.target.value))}
          className="w-40 accent-[#8b5cf6]"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <canvas ref={curvedRef} className="w-full rounded-lg border border-[var(--line)]" />
          <p className="mt-1 text-[11px] text-center" style={{ color: CURVED_COLOR }}>
            曲线流 · 平均误差 {err.curved.toFixed(3)}
          </p>
        </div>
        <div>
          <canvas ref={rectRef} className="w-full rounded-lg border border-[var(--line)]" />
          <p className="mt-1 text-[11px] text-center" style={{ color: STRAIGHT_COLOR }}>
            拉直流 · 平均误差 {err.rect.toFixed(3)}
          </p>
        </div>
      </div>
      <figcaption className="mt-2 text-[11px] text-ink-4 text-center">
        把 k 调到很小：曲线流的终点明显跑偏（误差大），拉直后的 rectified flow 几乎 1 步就精确命中数据
      </figcaption>
    </figure>
  );
}
