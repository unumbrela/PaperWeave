"use client";

// 通用热力图：把向量/矩阵渲染成方格。颜色一律用 rgba() 插值，
// 严禁 color-mix（规避 LightningCSS/Turbopack 静默丢 CSS 的坑）。

import { useMemo } from "react";

function maxAbs(data: number[][]): number {
  let m = 1e-6;
  for (const row of data) for (const x of row) m = Math.max(m, Math.abs(x));
  return m;
}

// 发散色：负=珊瑚红，正=海蓝，0≈纸色。
function divergingColor(v: number, scale: number): string {
  const t = Math.max(-1, Math.min(1, v / scale));
  const a = Math.abs(t);
  if (t >= 0) return `rgba(59, 110, 246, ${a.toFixed(3)})`;
  return `rgba(255, 93, 77, ${a.toFixed(3)})`;
}

// 顺序色：0=透明 → 1=给定色（用于注意力权重 0..1）。
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function sequentialColor(v: number, rgb: [number, number, number]): string {
  const a = Math.max(0, Math.min(1, v));
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${(0.12 + 0.88 * a).toFixed(3)})`;
}

export interface HeatmapProps {
  data: number[][];
  rowLabels?: string[];
  colLabels?: string[];
  /** 单元格边长 px。 */
  cell?: number;
  /** 发散色（默认 true，用于激活/嵌入）；false 时用 sequential（用于注意力 0..1）。 */
  diverging?: boolean;
  /** sequential 模式的色相。 */
  color?: string;
  /** 覆盖色彩归一化的尺度（默认取数据 maxAbs）。 */
  domainMax?: number;
  /** 高亮的行（其余行变暗）。 */
  highlightRow?: number | null;
  /** 高亮的单元格 [row, col]。 */
  highlightCell?: [number, number] | null;
  onRowHover?: (i: number | null) => void;
  /** 在格子里显示数值。 */
  showValues?: boolean;
}

export function Heatmap({
  data,
  rowLabels,
  colLabels,
  cell = 16,
  diverging = true,
  color = "#3b6ef6",
  domainMax,
  highlightRow = null,
  highlightCell = null,
  onRowHover,
  showValues = false,
}: HeatmapProps) {
  const scale = useMemo(() => domainMax ?? maxAbs(data), [data, domainMax]);
  const rgb = useMemo(() => hexToRgb(color), [color]);
  const cols = data[0]?.length ?? 0;

  return (
    <div className="inline-block">
      {colLabels && (
        <div className="flex" style={{ marginLeft: rowLabels ? 64 : 0 }}>
          {colLabels.map((l, j) => (
            <div
              key={j}
              className="text-[9px] text-ink-3 text-center overflow-hidden"
              style={{ width: cell, height: 14, lineHeight: "14px" }}
              title={l}
            >
              {l}
            </div>
          ))}
        </div>
      )}
      {data.map((row, i) => {
        const dim = highlightRow != null && highlightRow !== i;
        return (
          <div
            key={i}
            className="flex items-center transition-opacity"
            style={{ opacity: dim ? 0.28 : 1 }}
            onMouseEnter={onRowHover ? () => onRowHover(i) : undefined}
            onMouseLeave={onRowHover ? () => onRowHover(null) : undefined}
          >
            {rowLabels && (
              <div
                className="mono text-[10px] text-ink-2 pr-2 text-right truncate"
                style={{ width: 64 }}
                title={rowLabels[i]}
              >
                {rowLabels[i]}
              </div>
            )}
            {row.map((v, j) => {
              const isHl = highlightCell != null && highlightCell[0] === i && highlightCell[1] === j;
              const bg = diverging ? divergingColor(v, scale) : sequentialColor(v, rgb);
              return (
                <div
                  key={j}
                  className="flex items-center justify-center"
                  style={{
                    width: cell,
                    height: cell,
                    background: bg,
                    outline: isHl ? "2px solid rgba(26,23,19,0.7)" : "0.5px solid rgba(26,23,19,0.06)",
                    outlineOffset: isHl ? -2 : 0,
                  }}
                  title={`${v.toFixed(3)}`}
                >
                  {showValues && (
                    <span
                      className="mono"
                      style={{ fontSize: Math.min(9, cell * 0.42), color: "rgba(26,23,19,0.75)" }}
                    >
                      {v.toFixed(2)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
      {cols > 0 && null}
    </div>
  );
}
