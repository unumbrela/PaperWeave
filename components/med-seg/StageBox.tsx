"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  type FlowStep,
  ROLE_COLORS,
} from "@/lib/med-seg/flow-stages";

interface Props {
  step: FlowStep;
  index: number;
  inputSrc: string;
  predSrc: string;
  overlaySrc: string;
  active: boolean;
  passed: boolean; // playhead 已经经过
  onClick: () => void;
  onHover?: (hover: boolean) => void;
}

// 每个阶段使用哪张图做像素化预览
function pickSource(step: FlowStep, srcs: { input: string; pred: string; overlay: string }) {
  if (step.role === "decoder") return srcs.pred;
  if (step.role === "output" && step.detail === "mask") return srcs.pred;
  if (step.role === "output") return srcs.overlay;
  return srcs.input;
}

export function StageBox({
  step,
  index,
  inputSrc,
  predSrc,
  overlaySrc,
  active,
  passed,
  onClick,
  onHover,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colors = ROLE_COLORS[step.role];
  const src = pickSource(step, { input: inputSrc, pred: predSrc, overlay: overlaySrc });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const s = step.spatial;
      canvas.width = s;
      canvas.height = s;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, s, s);
      ctx.drawImage(img, 0, 0, s, s);

      // bottleneck: 叠一层深色 tint 来强调「压缩」
      if (step.role === "bottleneck") {
        ctx.fillStyle = "rgba(26,23,19,0.35)";
        ctx.fillRect(0, 0, s, s);
      }
    };
    img.src = src;
  }, [src, step.spatial, step.role]);

  // 通道数用堆叠层数暗示（log2 缩放）
  const depthLayers = Math.max(1, Math.min(6, Math.round(Math.log2(step.channels + 1) - 1)));

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      className={cn(
        "group relative flex flex-col items-center gap-1.5",
        "rounded-xl border px-2 pt-2 pb-1.5 transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
      )}
      style={{
        background: active
          ? colors.bg
          : passed
            ? `color-mix(in srgb, ${colors.bg} 70%, transparent)`
            : "rgba(255,255,255,0.55)",
        borderColor: active ? colors.border : "rgba(26,23,19,0.14)",
        boxShadow: active
          ? `0 10px 24px -10px ${colors.border}66, inset 0 0 0 1px ${colors.border}`
          : undefined,
      }}
      aria-pressed={active}
    >
      {/* 步骤编号 */}
      <span
        className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-mono tabular-nums"
        style={{
          background: colors.border,
          color: step.role === "bottleneck" ? "#f1e7d3" : "#fff",
        }}
      >
        {index}
      </span>

      {/* 通道堆叠（右上角的小堆） */}
      <div
        className="absolute top-1 right-1 flex flex-col items-end gap-[1px] pointer-events-none opacity-75"
        aria-hidden
      >
        {Array.from({ length: depthLayers }).map((_, i) => (
          <span
            key={i}
            className="block rounded-[1px]"
            style={{
              width: `${6 + i * 1.2}px`,
              height: 2,
              background: colors.border,
              opacity: 0.25 + (i / depthLayers) * 0.5,
            }}
          />
        ))}
      </div>

      {/* 特征体积（canvas 像素化缩略图） */}
      <div
        className="relative flex items-center justify-center rounded-md overflow-hidden"
        style={{
          width: 76,
          height: 76,
          background: "rgba(26,23,19,0.05)",
          border: `1px solid ${colors.border}33`,
        }}
      >
        {/* 按 spatial 缩放可视正方形尺寸，视觉强化「空间变化」 */}
        <canvas
          ref={canvasRef}
          style={{
            width: 70 * spatialScale(step.spatial),
            height: 70 * spatialScale(step.spatial),
            imageRendering: "pixelated",
            borderRadius: 2,
            // bottleneck 用暗色边
            boxShadow: step.role === "bottleneck" ? "inset 0 0 0 1px #000" : undefined,
          }}
        />
        {/* output 阶段做一个二值化感觉的 tint */}
        {step.detail === "mask" && (
          <div
            className="absolute inset-0 pointer-events-none mix-blend-multiply"
            style={{
              background:
                "radial-gradient(circle, rgba(26,23,19,0) 60%, rgba(26,23,19,0.2) 100%)",
            }}
          />
        )}
      </div>

      {/* label */}
      <div className="flex flex-col items-center gap-[1px] pt-0.5">
        <span
          className={cn(
            "serif text-[12.5px] leading-tight whitespace-nowrap",
            active ? "text-ink" : "text-ink-2",
          )}
          style={{ fontWeight: active ? 600 : 500 }}
        >
          {step.label}
        </span>
        <span className="text-[10px] text-ink-3 font-mono tabular-nums whitespace-nowrap">
          {step.shapeLabel}
        </span>
      </div>
    </button>
  );
}

// 按 spatial 归一化到 [0.55, 1.0]：8² 最小，256² 最大
function spatialScale(spatial: number): number {
  // log2(8) = 3, log2(256) = 8 → 归到 [0.55, 1]
  const l = Math.log2(spatial);
  const t = (l - 3) / (8 - 3);
  return 0.55 + Math.max(0, Math.min(1, t)) * 0.45;
}
