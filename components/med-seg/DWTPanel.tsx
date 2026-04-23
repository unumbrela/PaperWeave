"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface Props {
  sampleId: string;
}

interface Band {
  key: "ll" | "lh" | "hl" | "hh";
  label: string;
  caption: string;
  hint: string;
  accent?: boolean;
}

const bands: Band[] = [
  {
    key: "ll",
    label: "LL",
    caption: "低频近似",
    hint: "下采样一半的整体轮廓 · Mamba 分支主要处理这里",
  },
  {
    key: "lh",
    label: "LH",
    caption: "水平高频",
    hint: "跨行的强度变化 · 捕获横向边缘",
    accent: true,
  },
  {
    key: "hl",
    label: "HL",
    caption: "垂直高频",
    hint: "跨列的强度变化 · 捕获纵向边缘",
    accent: true,
  },
  {
    key: "hh",
    label: "HH",
    caption: "对角细节",
    hint: "最容易被低通滤掉的那部分 · 噪声和纹理",
    accent: true,
  },
];

export function DWTPanel({ sampleId }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <div className="overline" style={{ color: "#d29256" }}>
          DWT · Haar 小波分解
        </div>
        <h3 className="serif text-[20px] text-ink mt-0.5">
          一张图被拆成四个频带
        </h3>
        <p className="mt-2 text-[13.5px] text-ink-2 leading-relaxed">
          下图是对当前样本灰度图做一次 Haar DWT 得到的四个子带。
          <strong>LL</strong> 像下采样的原图；
          <strong className="mx-0.5">LH/HL</strong> 分别捕获水平、垂直边缘；
          <strong>HH</strong> 是对角高频细节。
          FW-Mamba Block 把这四个带拆出来之后，用可学习的{" "}
          <code>α_high</code> 只增强 LH/HL/HH，再 IDWT 回到特征图。
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {bands.map((b) => (
          <figure
            key={b.key}
            className={cn(
              "group rounded-lg overflow-hidden border border-[var(--line)]",
              b.accent && "ring-1 ring-[#d29256]/35",
            )}
          >
            <div
              className="relative aspect-square"
              style={{
                background: b.key === "ll" ? "#efe8dd" : "#17120d",
              }}
            >
              <Image
                src={`/med-seg/samples/${sampleId}/dwt/${b.key}.png`}
                alt={b.label}
                fill
                sizes="(min-width: 768px) 180px, 45vw"
                className={cn(
                  "object-cover",
                  b.key !== "ll" && "mix-blend-screen",
                )}
              />
            </div>
            <figcaption className="px-3 py-2 bg-paper/70 backdrop-blur-sm border-t border-[var(--line)]">
              <div className="flex items-baseline justify-between">
                <span className="serif text-[15px] text-ink">{b.label}</span>
                <span className="overline text-[10px]">{b.caption}</span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-ink-3">
                {b.hint}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
