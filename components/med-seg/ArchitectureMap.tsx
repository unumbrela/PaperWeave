"use client";

import { cn } from "@/lib/utils";
import { stageMeta } from "@/lib/med-seg/legacy-samples";
import type { StageId } from "@/lib/med-seg/types";

type Role = "input" | "encoder" | "bottleneck" | "decoder" | "output";

const ROLE_COLORS: Record<Role, { fill: string; stroke: string; label: string }> = {
  input: { fill: "#e9dec8", stroke: "#b09361", label: "输入" },
  encoder: { fill: "#d6dfe9", stroke: "#6b8ed6", label: "编码器" },
  bottleneck: { fill: "#1a1713", stroke: "#1a1713", label: "瓶颈" },
  decoder: { fill: "#ead9c7", stroke: "#d29256", label: "解码器" },
  output: { fill: "#e3d4d1", stroke: "#c96955", label: "输出" },
};

interface Props {
  selected: StageId;
  onSelect: (id: StageId) => void;
}

const WIDTH = 1120;
const HEIGHT = 240;

// Compute node layout: U-shape with encoder descending, decoder ascending
const nodeLayout: Record<StageId, { cx: number; cy: number; r: number }> = (() => {
  const laneY = { shallow: 60, mid: 120, deep: 180 };
  const step = (WIDTH - 120) / 8;
  const x0 = 60;
  return {
    patch_embed: { cx: x0 + 0 * step, cy: laneY.shallow, r: 20 },
    enc1: { cx: x0 + 1 * step, cy: laneY.shallow, r: 22 },
    enc2: { cx: x0 + 2 * step, cy: laneY.mid, r: 24 },
    enc3: { cx: x0 + 3 * step, cy: laneY.deep, r: 26 },
    bottleneck: { cx: x0 + 4 * step, cy: laneY.deep + 20, r: 30 },
    dec2: { cx: x0 + 5 * step, cy: laneY.deep, r: 26 },
    dec3: { cx: x0 + 6 * step, cy: laneY.mid, r: 24 },
    dec4: { cx: x0 + 7 * step, cy: laneY.shallow, r: 22 },
    final: { cx: x0 + 8 * step, cy: laneY.shallow, r: 20 },
  };
})();

const mainEdges: [StageId, StageId][] = [
  ["patch_embed", "enc1"],
  ["enc1", "enc2"],
  ["enc2", "enc3"],
  ["enc3", "bottleneck"],
  ["bottleneck", "dec2"],
  ["dec2", "dec3"],
  ["dec3", "dec4"],
  ["dec4", "final"],
];

const skipEdges: [StageId, StageId, "top" | "mid" | "low"][] = [
  ["enc1", "dec4", "low"],
  ["enc2", "dec3", "mid"],
  ["enc3", "dec2", "top"],
];

export function ArchitectureMap({ selected, onSelect }: Props) {
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label="FWMamba-UNet architecture"
      >
        {/* skip connections */}
        <g>
          {skipEdges.map(([from, to, level]) => {
            const a = nodeLayout[from];
            const b = nodeLayout[to];
            const dx = b.cx - a.cx;
            const lift = level === "top" ? 55 : level === "mid" ? 80 : 100;
            const cy = Math.min(a.cy, b.cy) - lift;
            const d = `M ${a.cx} ${a.cy} Q ${a.cx + dx / 2} ${cy} ${b.cx} ${b.cy}`;
            const active = selected === from || selected === to;
            return (
              <path
                key={`${from}-${to}`}
                d={d}
                fill="none"
                stroke={active ? "#d29256" : "rgba(210, 146, 86, 0.45)"}
                strokeWidth={active ? 1.8 : 1.1}
                strokeDasharray="4 3"
              />
            );
          })}
        </g>

        {/* main flow edges */}
        <g>
          {mainEdges.map(([from, to]) => {
            const a = nodeLayout[from];
            const b = nodeLayout[to];
            const active = selected === from || selected === to;
            return (
              <line
                key={`${from}-${to}`}
                x1={a.cx}
                y1={a.cy}
                x2={b.cx}
                y2={b.cy}
                stroke={active ? "#1a1713" : "rgba(26,23,19,0.28)"}
                strokeWidth={active ? 2.1 : 1.3}
              />
            );
          })}
        </g>

        {/* nodes */}
        <g>
          {stageMeta.map((s) => {
            const n = nodeLayout[s.id];
            const c = ROLE_COLORS[s.role as Role];
            const active = selected === s.id;
            return (
              <g
                key={s.id}
                className="cursor-pointer"
                onClick={() => onSelect(s.id)}
              >
                <circle
                  cx={n.cx}
                  cy={n.cy}
                  r={n.r + (active ? 4 : 0)}
                  fill={c.fill}
                  stroke={active ? "#1a1713" : c.stroke}
                  strokeWidth={active ? 2.2 : 1.2}
                  className="transition-all"
                  style={{
                    filter: active
                      ? "drop-shadow(0 6px 14px rgba(26,23,19,0.25))"
                      : undefined,
                  }}
                />
                <text
                  x={n.cx}
                  y={n.cy + 3}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight={active ? 600 : 500}
                  fill={s.role === "bottleneck" ? "#f4efe6" : "#1a1713"}
                >
                  {s.label.replace(/Encoder |Decoder /, "")}
                </text>
                <text
                  x={n.cx}
                  y={n.cy + n.r + 14}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill="rgba(26,23,19,0.55)"
                  className="pointer-events-none"
                >
                  {s.shape[2]}ch · {s.shape[0]}²
                </text>
              </g>
            );
          })}
        </g>

        {/* legend */}
        <g transform={`translate(${WIDTH - 280}, 16)`}>
          {(["encoder", "bottleneck", "decoder"] as Role[]).map((r, i) => {
            const c = ROLE_COLORS[r];
            return (
              <g key={r} transform={`translate(${i * 92}, 0)`}>
                <circle cx={6} cy={6} r={5} fill={c.fill} stroke={c.stroke} strokeWidth={1.2} />
                <text x={16} y={9.5} fontSize="10" fill="rgba(26,23,19,0.65)">
                  {c.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <p
        className={cn(
          "mt-2 text-center text-[11.5px] text-ink-3 transition-opacity",
        )}
      >
        点击任意节点查看该阶段的详细视图 · 曲线为 EAFF-Skip，实线为主干数据流
      </p>
    </div>
  );
}
