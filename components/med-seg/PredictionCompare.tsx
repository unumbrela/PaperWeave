"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { LegacySample } from "@/lib/med-seg/types";

interface Props {
  sample: LegacySample;
}

interface Panel {
  label: string;
  hint: string;
  src: string;
  tone?: "ink" | "accent";
}

export function PredictionCompare({ sample }: Props) {
  const panels: Panel[] = [
    { label: "Input", hint: "ISIC 2018 验证集皮肤镜图像", src: sample.input },
    { label: "Ground Truth", hint: "放射科医师手工勾画的病变边界", src: sample.gt },
    {
      label: "FWMamba 预测",
      hint: "sigmoid(logits) > 0.5 阈值化",
      src: sample.pred,
      tone: "accent",
    },
    {
      label: "Attention Overlay",
      hint: "最终 logits 经 softmax 的置信度热力图",
      src: sample.overlay,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="overline" style={{ color: "#6b8ed6" }}>
            Sample · {sample.id}
          </div>
          <div className="serif text-[22px] text-ink mt-1">
            FWMamba 在这张图上的表现
          </div>
        </div>
        <div className="flex items-center gap-4 text-[13px]">
          <Metric label="Dice" value={sample.dice} />
          <Metric label="IoU" value={sample.iou} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {panels.map((p) => (
          <div
            key={p.label}
            className={cn(
              "group relative overflow-hidden rounded-lg border border-[var(--line)]",
              p.tone === "accent" && "ring-1 ring-[#6b8ed6]/40",
            )}
          >
            <div className="relative aspect-square bg-[rgba(26,23,19,0.04)]">
              <Image
                src={p.src}
                alt={p.label}
                fill
                sizes="(min-width: 1024px) 280px, 45vw"
                className="object-cover"
              />
            </div>
            <div className="px-3 py-2 border-t border-[var(--line)] bg-paper/60 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="overline text-[10px]">{p.label}</span>
              </div>
              <p className="mt-0.5 text-[11.5px] text-ink-3 leading-snug line-clamp-2">
                {p.hint}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="overline text-[10px]">{label}</span>
      <span className="serif text-[22px] text-ink tabular-nums">
        {value.toFixed(3)}
      </span>
    </div>
  );
}
