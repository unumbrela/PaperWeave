"use client";

import { useMemo } from "react";
import * as d3 from "d3";
import type { AttentionHead } from "@/lib/transformer-explainer/types";

interface AttentionVisualizerProps {
  heads: AttentionHead[][];
  selectedLayer: number;
  selectedHead: number;
  tokenCount?: number;
  onCellHover?: (row: number, col: number) => void;
  onCellLeave?: () => void;
}

export function AttentionVisualizer({ 
  heads, 
  selectedLayer, 
  selectedHead, 
  tokenCount = 8,
  onCellHover,
  onCellLeave 
}: AttentionVisualizerProps) {
  const attentionData = useMemo(() => {
    if (!heads[selectedLayer]) return null;
    return heads[selectedLayer][selectedHead]?.scores || [];
  }, [heads, selectedLayer, selectedHead]);

  if (!attentionData || attentionData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-ink-3">
        <p>选择注意力头查看权重矩阵</p>
      </div>
    );
  }

  const size = 200;
  const cellSize = size / attentionData.length;

  return (
    <div className="flex flex-col items-center">
      <svg width={size + 40} height={size + 40} className="overflow-visible">
        <g transform="translate(25, 25)">
          {attentionData.map((row, i) =>
            row.map((score, j) => {
              const isMasked = i >= tokenCount || j >= tokenCount;
              return (
                <g key={`${i}-${j}`}>
                  <rect
                    x={j * cellSize}
                    y={i * cellSize}
                    width={cellSize}
                    height={cellSize}
                    fill={isMasked ? "#e5e7eb" : d3.interpolateBlues(score)}
                    stroke="white"
                    strokeWidth="1"
                    className="cursor-pointer transition-all duration-200"
                    style={{
                      opacity: isMasked ? 0.4 : 1,
                    }}
                    onMouseEnter={() => !isMasked && onCellHover?.(i, j)}
                    onMouseLeave={onCellLeave}
                  />
                  {isMasked && (
                    <line
                      x1={j * cellSize}
                      y1={i * cellSize}
                      x2={j * cellSize + cellSize}
                      y2={i * cellSize + cellSize}
                      stroke="#9ca3af"
                      strokeWidth="1"
                      opacity={0.6}
                    />
                  )}
                  {!isMasked && (
                    <text
                      x={j * cellSize + cellSize / 2}
                      y={i * cellSize + cellSize / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-ink-4"
                      style={{ 
                        fontSize: cellSize > 20 ? "10px" : "8px",
                        pointerEvents: "none"
                      }}
                    >
                      {score.toFixed(2)}
                    </text>
                  )}
                </g>
              );
            })
          )}
          
          {attentionData.map((_, i) => (
            <text
              key={`col-${i}`}
              x={i * cellSize + cellSize / 2}
              y={-8}
              textAnchor="middle"
              className="fill-ink-3"
              style={{ 
                fontSize: "10px",
                opacity: i < tokenCount ? 1 : 0.4
              }}
            >
              {i + 1}
            </text>
          ))}
          
          {attentionData.map((_, i) => (
            <text
              key={`row-${i}`}
              x={-8}
              y={i * cellSize + cellSize / 2 + 3}
              textAnchor="end"
              className="fill-ink-3"
              style={{ 
                fontSize: "10px",
                opacity: i < tokenCount ? 1 : 0.4
              }}
            >
              {i + 1}
            </text>
          ))}
        </g>
      </svg>
      
      <div className="mt-4 flex items-center gap-4">
        <span className="text-xs text-ink-3">低</span>
        <div className="w-32 h-3 rounded" style={{ background: "linear-gradient(to right, white, blue)" }} />
        <span className="text-xs text-ink-3">高</span>
        <div className="flex items-center gap-1 ml-4">
          <div className="w-4 h-4 rounded bg-gray-200 border border-gray-300" />
          <span className="text-xs text-ink-3">Mask</span>
        </div>
      </div>
    </div>
  );
}