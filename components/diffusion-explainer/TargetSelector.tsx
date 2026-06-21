"use client";

import type { PresetId, Vec2 } from "@/lib/diffusion-explainer/types";
import { PRESETS } from "@/lib/diffusion-explainer/config";
import { DrawCanvas } from "./DrawCanvas";

export function TargetSelector({
  presetId,
  onSelect,
  onDrawChange,
}: {
  presetId: PresetId;
  onSelect: (id: PresetId) => void;
  onDrawChange: (points: Vec2[]) => void;
}) {
  return (
    <div className="rise surface rounded-2xl border border-[var(--line)] p-5">
      <h3 className="serif text-base text-ink mb-3">目标分布</h3>
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`px-2 py-2 rounded-lg text-sm transition-all ${
              presetId === p.id
                ? "bg-[#8b5cf6] text-white shadow-sm"
                : "bg-surface border border-[var(--line)] text-ink-2 hover:border-[#8b5cf6]"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => onSelect("draw")}
          className={`px-2 py-2 rounded-lg text-sm transition-all ${
            presetId === "draw"
              ? "bg-[#8b5cf6] text-white shadow-sm"
              : "bg-surface border border-[var(--line)] text-ink-2 hover:border-[#8b5cf6]"
          }`}
        >
          ✎ 自绘
        </button>
      </div>

      {presetId === "draw" && (
        <div className="mt-4">
          <p className="text-xs text-ink-3 mb-2">在下方画布上涂抹，绘制你自己的目标分布：</p>
          <DrawCanvas onChange={onDrawChange} />
        </div>
      )}
    </div>
  );
}
