"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { FLOW_STEPS, SKIP_ARCS } from "@/lib/med-seg/flow-stages";
import type { LegacySample } from "@/lib/med-seg/types";
import { StageBox } from "./StageBox";

interface Props {
  sample: LegacySample;
  activeIndex: number;
  onActiveChange: (i: number) => void;
}

export function Pipeline({ sample, activeIndex, onActiveChange }: Props) {
  const [playing, setPlaying] = useState(false);
  const [centers, setCenters] = useState<{ x: number; y: number }[]>([]);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const trackRef = useRef<HTMLDivElement>(null);
  const boxRefs = useRef<Array<HTMLDivElement | null>>([]);

  // 测量节点中心坐标，给 SVG 叠加层用
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const rect = track.getBoundingClientRect();
      const next = boxRefs.current.map((el) => {
        if (!el) return { x: 0, y: 0 };
        const r = el.getBoundingClientRect();
        return {
          x: r.left - rect.left + r.width / 2,
          y: r.top - rect.top + r.height / 2,
        };
      });
      setCenters(next);
      setSize({ w: rect.width, h: rect.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, []);

  // play loop
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (activeIndex >= FLOW_STEPS.length - 1) {
        setPlaying(false);
      } else {
        onActiveChange(activeIndex + 1);
      }
    }, 1100);
    return () => clearTimeout(t);
  }, [playing, activeIndex, onActiveChange]);

  const step = (dir: 1 | -1) => {
    const next = Math.max(0, Math.min(FLOW_STEPS.length - 1, activeIndex + dir));
    onActiveChange(next);
  };

  return (
    <div className="space-y-4">
      {/* 控制条 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition-colors",
              playing
                ? "border-ink bg-ink text-paper"
                : "border-[var(--line-strong)] text-ink-2 hover:text-ink hover:border-ink/50",
            )}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? "暂停" : "自动播放"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              onActiveChange(0);
            }}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--line-strong)] px-2.5 py-1.5 text-[12px] text-ink-2 hover:text-ink hover:border-ink/50 transition-colors"
            title="重置到输入"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <div className="ml-1 flex items-center gap-1">
            <button
              type="button"
              onClick={() => step(-1)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--line)] text-ink-2 hover:text-ink hover:border-ink/50 disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={activeIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--line)] text-ink-2 hover:text-ink hover:border-ink/50 disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={activeIndex === FLOW_STEPS.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 进度指示 */}
        <div className="flex items-center gap-3 text-[11.5px] text-ink-3 tabular-nums">
          <span className="overline text-[10px]">Stage</span>
          <span className="font-mono">
            {String(activeIndex + 1).padStart(2, "0")}
            <span className="opacity-40"> / {FLOW_STEPS.length}</span>
          </span>
          <span className="hidden sm:inline text-ink-2">·</span>
          <span className="hidden sm:inline serif-italic text-ink-2">
            {FLOW_STEPS[activeIndex].label}
          </span>
        </div>
      </div>

      {/* 画布主体：节点 + SVG 叠加（skip 弧线 + 主路径） */}
      <div ref={trackRef} className="relative pt-10 pb-3">
        {/* SVG 叠加在节点上层，只绘制弧线与主路径，节点自己画圆角矩形 */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={size.w}
          height={size.h}
          style={{ overflow: "visible" }}
        >
          {/* 主干箭头 */}
          {centers.length === FLOW_STEPS.length &&
            centers.slice(0, -1).map((c, i) => {
              const n = centers[i + 1];
              const active = i < activeIndex;
              const flowing = i === activeIndex - 1;
              return (
                <line
                  key={`edge-${i}`}
                  x1={c.x + 42}
                  y1={c.y}
                  x2={n.x - 42}
                  y2={n.y}
                  stroke={active || flowing ? "#1a1713" : "rgba(26,23,19,0.25)"}
                  strokeWidth={flowing ? 2 : 1.2}
                  markerEnd={active || flowing ? "url(#arrow-ink)" : "url(#arrow-dim)"}
                  style={{ transition: "stroke 240ms ease" }}
                />
              );
            })}
          {/* skip 弧 */}
          {centers.length === FLOW_STEPS.length &&
            SKIP_ARCS.map((arc) => {
              const fromIdx = FLOW_STEPS.findIndex((s) => s.id === arc.from);
              const toIdx = FLOW_STEPS.findIndex((s) => s.id === arc.to);
              if (fromIdx < 0 || toIdx < 0) return null;
              const a = centers[fromIdx];
              const b = centers[toIdx];
              if (!a || !b) return null;
              const lift =
                arc.level === "top" ? 42 : arc.level === "mid" ? 60 : 78;
              const top = Math.min(a.y, b.y) - lift;
              const d = `M ${a.x} ${a.y - 42} C ${a.x} ${top}, ${b.x} ${top}, ${b.x} ${b.y - 42}`;
              const highlight =
                activeIndex === fromIdx || activeIndex === toIdx;
              return (
                <g key={arc.level}>
                  <path
                    d={d}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth={highlight ? 1.8 : 1.1}
                    strokeDasharray="4 3"
                    opacity={highlight ? 0.95 : 0.5}
                    style={{ transition: "all 240ms ease" }}
                  />
                  <text
                    x={(a.x + b.x) / 2}
                    y={top - 4}
                    textAnchor="middle"
                    fontSize="10"
                    fill={arc.color}
                    opacity={highlight ? 1 : 0.6}
                    className="serif-italic"
                  >
                    {arc.label}
                  </text>
                </g>
              );
            })}
          <defs>
            <marker
              id="arrow-ink"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#1a1713" />
            </marker>
            <marker
              id="arrow-dim"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(26,23,19,0.35)" />
            </marker>
          </defs>
        </svg>

        {/* 节点行 */}
        <div className="relative flex items-end justify-between gap-1 overflow-x-auto pb-1">
          {FLOW_STEPS.map((s, i) => (
            <div
              key={s.id}
              ref={(el) => {
                boxRefs.current[i] = el;
              }}
              className="flex-shrink-0"
            >
              <StageBox
                step={s}
                index={i}
                inputSrc={sample.thumb}
                predSrc={sample.pred}
                overlaySrc={sample.overlay}
                active={i === activeIndex}
                passed={i < activeIndex}
                onClick={() => {
                  setPlaying(false);
                  onActiveChange(i);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 进度条 */}
      <div className="relative h-1 rounded-full bg-[rgba(26,23,19,0.08)] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${((activeIndex + 0.5) / FLOW_STEPS.length) * 100}%`,
            background: "linear-gradient(90deg, #6b8ed6, #d29256, #c96955)",
            transition: "width 280ms ease",
          }}
        />
      </div>
      <p className="text-[11.5px] text-ink-3 text-center">
        点节点 · 用 ◀ ▶ 或 <span className="serif-italic">自动播放</span> 看一张图从输入流到分割掩膜的全过程
      </p>
    </div>
  );
}
