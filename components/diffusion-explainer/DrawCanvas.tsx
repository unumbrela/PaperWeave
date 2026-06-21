"use client";

import { useEffect, useRef, useState } from "react";
import type { Vec2 } from "@/lib/diffusion-explainer/types";
import { CANVAS_SIZE, TARGET_COLOR } from "@/lib/diffusion-explainer/config";
import {
  clearCanvas,
  dataToPx,
  drawAxes,
  pxToData,
  setupHiDPICanvas,
} from "@/lib/diffusion-explainer/draw-utils";

/**
 * 在画布上涂抹，收集自定义二维目标分布（数据坐标）。
 * 行为与 GAN Lab 的「draw your own」一致。
 */
export function DrawCanvas({ onChange }: { onChange: (points: Vec2[]) => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const posRef = useRef<Vec2[]>([]);
  const [count, setCount] = useState(0);

  const redraw = () => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const w = CANVAS_SIZE;
    const h = CANVAS_SIZE;
    clearCanvas(ctx, w, h);
    drawAxes(ctx, w, h);
    ctx.fillStyle = TARGET_COLOR;
    for (const p of posRef.current) {
      const [px, py] = dataToPx(p, w, h);
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    setupHiDPICanvas(c, CANVAS_SIZE);
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addAt = (clientX: number, clientY: number) => {
    const c = ref.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * CANVAS_SIZE;
    const py = ((clientY - rect.top) / rect.height) * CANVAS_SIZE;
    const [dx, dy] = pxToData([px, py], CANVAS_SIZE, CANVAS_SIZE);
    // 在落点周围撒几个点，涂抹更顺手
    for (let i = 0; i < 4; i++) {
      posRef.current.push([dx + (Math.random() - 0.5) * 0.25, dy + (Math.random() - 0.5) * 0.25]);
    }
    setCount(posRef.current.length);
    onChange([...posRef.current]);
    redraw();
  };

  const clear = () => {
    posRef.current = [];
    setCount(0);
    onChange([]);
    redraw();
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={ref}
        className="w-full cursor-crosshair rounded-lg border border-[var(--line)] touch-none"
        onPointerDown={(e) => {
          drawingRef.current = true;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          addAt(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (drawingRef.current) addAt(e.clientX, e.clientY);
        }}
        onPointerUp={() => (drawingRef.current = false)}
      />
      <div className="flex items-center justify-between text-xs text-ink-3">
        <span>已绘制 {count} 个点（建议 ≥ 30）</span>
        <button
          onClick={clear}
          className="rounded border border-[var(--line)] px-2 py-0.5 hover:bg-stone-50"
        >
          清空
        </button>
      </div>
    </div>
  );
}
