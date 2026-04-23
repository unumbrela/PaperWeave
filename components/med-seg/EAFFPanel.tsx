"use client";

import Image from "next/image";
import type { LegacySample } from "@/lib/med-seg/types";

interface Props {
  sample: LegacySample;
}

export function EAFFPanel({ sample }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <div className="overline" style={{ color: "#d29256" }}>
          EAFF-Skip · 边缘感知融合
        </div>
        <h3 className="serif text-[20px] text-ink mt-0.5">
          让 skip connection 认识边界
        </h3>
        <p className="mt-2 text-[13.5px] text-ink-2 leading-relaxed">
          EAFF-Skip 的做法：对 encoder 特征再做一次 DWT，
          把三个高频带拼起来过 1×1 卷积 + sigmoid 生成一张{" "}
          <em>空间边缘注意力图</em>，然后做{" "}
          <code className="font-mono text-[12px]">fused = dec + enc + edge·enc</code>
          。下图是
          <strong>示意版</strong>——从 GT 的边界梯度反推出&ldquo;理想的边缘注意力&rdquo;应该是什么样，
          帮助理解这张注意力图在空间上会亮在哪里。真实的 edge attention
          会在后续 Phase 2 脚本导出后替换。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Cell
          label="Encoder feature"
          caption="某层 skip 的输入特征（示意）"
          media={
            <Image
              src={sample.input}
              alt="encoder feature"
              fill
              sizes="(min-width: 768px) 240px, 90vw"
              className="object-cover opacity-70"
            />
          }
        />
        <Cell
          label="Edge attention"
          caption="DWT 高频 → 1×1 Conv → Sigmoid"
          accent
          media={
            <div className="relative h-full w-full">
              <Image
                src={sample.input}
                alt="base"
                fill
                sizes="(min-width: 768px) 240px, 90vw"
                className="object-cover opacity-35"
              />
              <Image
                src={`/med-seg/samples/${sample.id}/edge_attn_preview.png`}
                alt="edge attn"
                fill
                sizes="(min-width: 768px) 240px, 90vw"
                className="object-cover"
              />
            </div>
          }
        />
        <Cell
          label="Fused"
          caption="dec + enc + edge·enc"
          media={
            <Image
              src={sample.overlay}
              alt="fused"
              fill
              sizes="(min-width: 768px) 240px, 90vw"
              className="object-cover"
            />
          }
        />
      </div>
    </div>
  );
}

function Cell({
  label,
  caption,
  media,
  accent,
}: {
  label: string;
  caption: string;
  media: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <figure
      className={
        "overflow-hidden rounded-lg border border-[var(--line)]" +
        (accent ? " ring-1 ring-[#d29256]/40" : "")
      }
    >
      <div className="relative aspect-square bg-[rgba(26,23,19,0.04)]">
        {media}
      </div>
      <figcaption className="px-3 py-2 bg-paper/70 border-t border-[var(--line)]">
        <div className="flex items-baseline justify-between">
          <span className="serif text-[14.5px] text-ink">{label}</span>
        </div>
        <p className="mt-0.5 text-[11px] leading-snug text-ink-3">{caption}</p>
      </figcaption>
    </figure>
  );
}
