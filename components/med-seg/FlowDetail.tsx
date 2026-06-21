"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { LegacySample } from "@/lib/med-seg/types";
import {
  type FlowStep,
  ROLE_COLORS,
} from "@/lib/med-seg/flow-stages";

interface Props {
  step: FlowStep;
  sample: LegacySample;
}

export function FlowDetail({ step, sample }: Props) {
  const colors = ROLE_COLORS[step.role];

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* 左栏：stage 文案 */}
      <aside className="col-span-12 xl:col-span-4 space-y-4">
        <div>
          <div
            className="overline"
            style={{ color: colors.border }}
          >
            Stage · {step.label}
          </div>
          <h3 className="serif text-[24px] text-ink mt-1 leading-tight">
            {step.sublabel}
          </h3>
          <div className="mt-2 text-[11.5px] text-ink-3 font-mono tabular-nums">
            {step.shapeLabel}
            {step.depth ? ` · blocks = ${step.depth}` : ""}
          </div>
        </div>

        <p className="text-[14px] leading-relaxed text-ink-2">{step.summary}</p>

        <ul className="space-y-1.5">
          {step.transforms.map((t) => (
            <li
              key={t}
              className="flex items-start gap-2 text-[12.5px] text-ink-2"
            >
              <span
                className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full"
                style={{ background: colors.border }}
              />
              <span>{t}</span>
            </li>
          ))}
        </ul>

        {/* 指标小块：在 output 时展示 */}
        {step.detail === "mask" && (
          <div className="mt-2 flex items-center gap-4 rounded-lg border border-[var(--line)] bg-paper/60 p-3">
            <Metric label="Dice" value={sample.dice} />
            <span className="h-6 w-px bg-[var(--line-strong)]" />
            <Metric label="IoU" value={sample.iou} />
          </div>
        )}
      </aside>

      {/* 右栏：可视化 */}
      <section className="col-span-12 xl:col-span-8">
        {step.detail === "input" && <InputDetail sample={sample} />}
        {step.detail === "patchify" && <PatchifyDetail sample={sample} />}
        {step.detail === "fwblock" && <FWBlockDetail sample={sample} />}
        {step.detail === "bottleneck" && <BottleneckDetail sample={sample} />}
        {step.detail === "eaff" && <EAFFDetail sample={sample} step={step} />}
        {step.detail === "final_sigmoid" && (
          <FinalSigmoidDetail sample={sample} />
        )}
        {step.detail === "mask" && <MaskDetail sample={sample} />}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="overline text-[10px]">{label}</span>
      <span className="serif text-[22px] text-ink tabular-nums">
        {value.toFixed(3)}
      </span>
    </div>
  );
}

/* ---------- detail variants ---------- */

function InputDetail({ sample }: { sample: LegacySample }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <figure className="overflow-hidden rounded-lg border border-[var(--line)]">
        <div className="relative aspect-square bg-[rgba(26,23,19,0.04)]">
          <Image
            src={sample.input}
            alt="input"
            fill
            priority
            sizes="(min-width: 1280px) 320px, 45vw"
            placeholder="blur"
            blurDataURL={sample.blur.input}
            className="object-cover"
          />
        </div>
        <figcaption className="px-3 py-2 bg-paper/70 border-t border-[var(--line)]">
          <span className="overline text-[10px]">原图 · 256×256×3</span>
          <p className="mt-0.5 text-[11.5px] text-ink-3">
            皮肤镜 RGB 图像，直接作为网络输入。
          </p>
        </figcaption>
      </figure>
      <figure className="overflow-hidden rounded-lg border border-[var(--line)]">
        <div className="relative aspect-square bg-[rgba(26,23,19,0.04)]">
          <Image
            src={sample.gt}
            alt="ground truth"
            fill
            sizes="(min-width: 1280px) 320px, 45vw"
            className="object-cover"
          />
        </div>
        <figcaption className="px-3 py-2 bg-paper/70 border-t border-[var(--line)]">
          <span className="overline text-[10px]">Ground Truth</span>
          <p className="mt-0.5 text-[11.5px] text-ink-3">
            放射科医师手工勾画的病变边界——训练时当标签，评估时算 Dice / IoU。
          </p>
        </figcaption>
      </figure>
    </div>
  );
}

function PatchifyDetail({ sample }: { sample: LegacySample }) {
  return (
    <div className="space-y-3">
      <div className="overline text-[10px]" style={{ color: "#8f79b0" }}>
        Patch Embed · 把像素变成 token
      </div>
      <div className="relative aspect-[2/1] overflow-hidden rounded-lg border border-[var(--line)] bg-[rgba(26,23,19,0.04)]">
        <Image
          src={sample.input}
          alt="input"
          fill
          sizes="(min-width: 1024px) 640px, 90vw"
          placeholder="blur"
          blurDataURL={sample.blur.input}
          className="object-cover"
        />
        {/* 叠一层 16×8 的 patch 栅格（示意） */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 32 16" preserveAspectRatio="none">
          {Array.from({ length: 33 }).map((_, i) => (
            <line
              key={`v-${i}`}
              x1={i}
              y1={0}
              x2={i}
              y2={16}
              stroke="rgba(143,121,176,0.55)"
              strokeWidth={0.04}
            />
          ))}
          {Array.from({ length: 17 }).map((_, i) => (
            <line
              key={`h-${i}`}
              x1={0}
              y1={i}
              x2={32}
              y2={i}
              stroke="rgba(143,121,176,0.55)"
              strokeWidth={0.04}
            />
          ))}
        </svg>
      </div>
      <p className="text-[12.5px] text-ink-3 leading-relaxed">
        每个 <strong>4×4 像素块</strong> 被一个卷积核（stride=4, out=96）一次性压成 96 维向量。整张图从 256²×3 像素变成 64²×96 个 token。Mamba 系的共识：一步到位大步长下采样，而不是像 CNN 那样逐层小步走。
      </p>
    </div>
  );
}

function FWBlockDetail({ sample }: { sample: LegacySample }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="overline text-[10px]" style={{ color: "#6b8ed6" }}>
          FW-Mamba Block 内部
        </div>
        <p className="mt-1 text-[13px] text-ink-2 leading-relaxed">
          输入被并行送进两条分支：上路 <strong>SS2D (Mamba)</strong> 做全局语义扫描；下路 <strong>DWT</strong> 把特征拆成四个频带，对高频再精炼。最后用可学习的 β（初值 0.1）把两路融合回主干。
        </p>
      </div>

      {/* 简化的双分支图示 */}
      <svg viewBox="0 0 640 200" className="w-full h-auto">
        <g>
          <rect x={10} y={82} width={60} height={36} rx={8} fill="#f1e7d3" stroke="#b09361" />
          <text x={40} y={105} textAnchor="middle" fontSize="11" fill="#1a1713">x</text>
        </g>
        <g>
          <rect x={120} y={20} width={150} height={50} rx={10} fill="#d6dfe9" stroke="#6b8ed6" />
          <text x={195} y={40} textAnchor="middle" fontSize="11" fill="#1a1713" fontWeight={600}>LayerNorm</text>
          <text x={195} y={55} textAnchor="middle" fontSize="10" fill="rgba(26,23,19,0.7)">→ SS2D (Mamba)</text>
        </g>
        <g>
          <rect x={120} y={130} width={150} height={50} rx={10} fill="#ead9c7" stroke="#d29256" />
          <text x={195} y={149} textAnchor="middle" fontSize="11" fill="#1a1713" fontWeight={600}>DWT</text>
          <text x={195} y={164} textAnchor="middle" fontSize="10" fill="rgba(26,23,19,0.7)">LL, LH, HL, HH · DW-Conv</text>
        </g>
        <g>
          <rect x={300} y={130} width={70} height={50} rx={10} fill="#ead9c7" stroke="#d29256" />
          <text x={335} y={152} textAnchor="middle" fontSize="11" fill="#1a1713" fontWeight={600}>IDWT</text>
          <text x={335} y={167} textAnchor="middle" fontSize="9.5" fill="rgba(26,23,19,0.6)">α_low · LL</text>
        </g>
        <g>
          <circle cx={430} cy={155} r={16} fill="#fff8ea" stroke="#d29256" strokeDasharray="3 2" />
          <text x={430} y={160} textAnchor="middle" fontSize="12" fill="#1a1713" fontWeight={600}>β</text>
        </g>
        <g>
          <circle cx={520} cy={95} r={20} fill="#f1e7d3" stroke="#1a1713" strokeWidth={1.3} />
          <text x={520} y={101} textAnchor="middle" fontSize="15" fill="#1a1713" fontWeight={600}>+</text>
        </g>
        <g>
          <rect x={580} y={77} width={50} height={36} rx={8} fill="#e3d4d1" stroke="#c96955" />
          <text x={605} y={100} textAnchor="middle" fontSize="11" fill="#1a1713">out</text>
        </g>
        <g fill="none" stroke="rgba(26,23,19,0.5)" strokeWidth="1.3">
          <path d="M 70 100 L 120 45" />
          <path d="M 70 100 L 120 155" />
          <path d="M 270 45 L 502 95" />
          <path d="M 270 155 L 300 155" />
          <path d="M 370 155 L 414 155" />
          <path d="M 446 155 L 505 100" />
          <path d="M 540 95 L 580 95" />
          <path d="M 40 82 Q 40 8 460 8 Q 518 8 520 75" stroke="rgba(26,23,19,0.3)" strokeDasharray="4 3" />
        </g>
      </svg>

      {/* DWT 四频带 */}
      <div>
        <div className="text-[11.5px] text-ink-3 mb-2">
          <strong className="text-ink-2">下图 ↓</strong> 是对当前样本做一次 Haar DWT 的真实四个子带——这就是频率分支最内层看到的东西。
        </div>
        <div className="grid grid-cols-4 gap-2">
          {([
            { k: "ll", label: "LL", hint: "低频近似" },
            { k: "lh", label: "LH", hint: "水平高频" },
            { k: "hl", label: "HL", hint: "垂直高频" },
            { k: "hh", label: "HH", hint: "对角细节" },
          ] as const).map((b) => (
            <figure
              key={b.k}
              className={cn(
                "overflow-hidden rounded-md border border-[var(--line)]",
                b.k !== "ll" && "ring-1 ring-[#d29256]/35",
              )}
            >
              <div
                className="relative aspect-square"
                style={{ background: b.k === "ll" ? "#efe8dd" : "#17120d" }}
              >
                <Image
                  src={sample.dwt[b.k]}
                  alt={b.label}
                  fill
                  sizes="120px"
                  className={cn(
                    "object-cover",
                    b.k !== "ll" && "mix-blend-screen",
                  )}
                />
              </div>
              <figcaption className="px-2 py-1 text-center bg-paper/70 border-t border-[var(--line)]">
                <span className="serif text-[12px] text-ink">{b.label}</span>
                <span className="ml-1 text-[10px] text-ink-3">{b.hint}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}

function BottleneckDetail({ sample }: { sample: LegacySample }) {
  return (
    <div className="space-y-4">
      <div className="overline text-[10px]" style={{ color: "#f4c25a" }}>
        Bottleneck · 整个网络最窄的地方
      </div>
      <div className="grid grid-cols-3 gap-3 items-stretch">
        <PixelCell src={sample.input} label="原图" caption="256²×3" scale={1} />
        <PixelCell src={sample.input} label="压缩语义" caption="8²×768（示意）" scale={1 / 32} tint dark />
        <PixelCell src={sample.pred} label="即将展开" caption="mask 还在胚胎里" scale={1 / 16} tint />
      </div>
      <p className="text-[12.5px] text-ink-2 leading-relaxed">
        到这里一张 256² 的皮肤镜图像被压成 <strong>8×8 = 64 个 token</strong>，每个 token 是 768 维的语义向量。空间信息几乎全没了，换来的是「整张图在说什么」被完整吸收。接下来 Decoder 要带着这些语义向量，借助 skip 把像素级的位置信息一点点找回来。
      </p>
    </div>
  );
}

function EAFFDetail({
  sample,
  step,
}: {
  sample: LegacySample;
  step: FlowStep;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="overline text-[10px]" style={{ color: "#d29256" }}>
          EAFF-Skip · {step.label}
        </div>
        <p className="mt-1 text-[13px] text-ink-2 leading-relaxed">
          对 encoder 的 skip 特征再做一次 DWT，取高频带 <code>{"{LH, HL, HH}"}</code> 过 1×1 Conv + sigmoid，得到一张 <em>边缘注意力图</em>。然后
          <code className="mx-1 font-mono text-[12px]">fused = dec + enc + edge·enc</code>——边缘处的 encoder 特征被额外加权一遍。
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Cell
          label="Encoder skip"
          caption={`来自 ${step.skipTarget === "top" ? "Encoder 3" : step.skipTarget === "mid" ? "Encoder 2" : "Encoder 1"} 的特征（示意）`}
          media={
            <Image
              src={sample.input}
              alt="encoder feature"
              fill
              sizes="(min-width: 1280px) 240px, 40vw"
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
                sizes="(min-width: 1280px) 240px, 40vw"
                className="object-cover opacity-35"
              />
              <Image
                src={sample.edgeAttn}
                alt="edge attn"
                fill
                sizes="(min-width: 1280px) 240px, 40vw"
                className="object-cover"
              />
            </div>
          }
        />
        <Cell
          label="Fused"
          caption="dec + enc + edge·enc → 精炼"
          media={
            <Image
              src={sample.overlay}
              alt="fused"
              fill
              sizes="(min-width: 1280px) 240px, 40vw"
              placeholder="blur"
              blurDataURL={sample.blur.overlay}
              className="object-cover"
            />
          }
        />
      </div>
    </div>
  );
}

function FinalSigmoidDetail({ sample }: { sample: LegacySample }) {
  return (
    <div className="space-y-4">
      <div className="overline text-[10px]" style={{ color: "#c96955" }}>
        Final · sigmoid → threshold
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Cell
          label="Logits 概率图"
          caption="sigmoid 前的原始输出 ≈ overlay"
          media={
            <Image
              src={sample.overlay}
              alt="logits"
              fill
              sizes="(min-width: 1280px) 240px, 40vw"
              placeholder="blur"
              blurDataURL={sample.blur.overlay}
              className="object-cover"
            />
          }
        />
        <figure className="overflow-hidden rounded-lg border border-[var(--line)] bg-paper/60">
          <div className="relative aspect-square bg-[rgba(26,23,19,0.04)] flex items-center justify-center">
            <svg viewBox="0 0 100 60" className="w-[80%] h-auto">
              <path
                d="M 0 55 C 30 55, 40 30, 50 30 C 60 30, 70 5, 100 5"
                fill="none"
                stroke="#c96955"
                strokeWidth={1.8}
              />
              <line x1={50} y1={0} x2={50} y2={60} stroke="rgba(26,23,19,0.25)" strokeDasharray="2 2" />
              <text x={52} y={14} fontSize="6" fill="rgba(26,23,19,0.6)">threshold = 0.5</text>
              <text x={2} y={58} fontSize="5" fill="rgba(26,23,19,0.55)">0</text>
              <text x={94} y={10} fontSize="5" fill="rgba(26,23,19,0.55)">1</text>
            </svg>
          </div>
          <figcaption className="px-3 py-2 border-t border-[var(--line)]">
            <span className="overline text-[10px]">sigmoid(·)</span>
            <p className="mt-0.5 text-[11.5px] text-ink-3">
              按 0.5 阈值切：&gt; 0.5 → 前景，否则 → 背景。
            </p>
          </figcaption>
        </figure>
        <Cell
          label="二值掩膜"
          caption="最终输出 · pred"
          accent
          media={
            <Image
              src={sample.pred}
              alt="pred mask"
              fill
              sizes="(min-width: 1280px) 240px, 40vw"
              className="object-cover"
            />
          }
        />
      </div>
    </div>
  );
}

function MaskDetail({ sample }: { sample: LegacySample }) {
  return (
    <div className="space-y-3">
      <div className="overline text-[10px]" style={{ color: "#c96955" }}>
        对比 Ground Truth
      </div>
      <div className="grid grid-cols-4 gap-3">
        <Cell
          label="Input"
          caption="输入原图"
          media={
            <Image src={sample.input} alt="input" fill sizes="200px" className="object-cover" />
          }
        />
        <Cell
          label="GT"
          caption="医师手绘边界"
          media={
            <Image src={sample.gt} alt="gt" fill sizes="200px" className="object-cover" />
          }
        />
        <Cell
          label="Pred"
          caption="模型预测掩膜"
          accent
          media={
            <Image src={sample.pred} alt="pred" fill sizes="200px" className="object-cover" />
          }
        />
        <Cell
          label="Overlay"
          caption="置信度热力图"
          media={
            <Image src={sample.overlay} alt="overlay" fill sizes="200px" className="object-cover" />
          }
        />
      </div>
    </div>
  );
}

/* ---------- small helpers ---------- */

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
      className={cn(
        "overflow-hidden rounded-lg border border-[var(--line)]",
        accent && "ring-1 ring-[#d29256]/45",
      )}
    >
      <div className="relative aspect-square bg-[rgba(26,23,19,0.04)]">{media}</div>
      <figcaption className="px-3 py-2 bg-paper/70 border-t border-[var(--line)]">
        <span className="overline text-[10px]">{label}</span>
        <p className="mt-0.5 text-[11px] leading-snug text-ink-3">{caption}</p>
      </figcaption>
    </figure>
  );
}

function PixelCell({
  src,
  label,
  caption,
  scale,
  tint,
  dark,
}: {
  src: string;
  label: string;
  caption: string;
  scale: number;
  tint?: boolean;
  dark?: boolean;
}) {
  return (
    <figure className="overflow-hidden rounded-lg border border-[var(--line)]">
      <div
        className="relative aspect-square bg-[rgba(26,23,19,0.08)] flex items-center justify-center overflow-hidden"
      >
        <div
          className="relative"
          style={{
            width: `${Math.max(14, 100 * scale)}%`,
            height: `${Math.max(14, 100 * scale)}%`,
            imageRendering: "pixelated",
          }}
        >
          <Image
            src={src}
            alt={label}
            fill
            sizes="200px"
            className="object-cover"
            style={{
              imageRendering: "pixelated",
              filter: dark ? "brightness(0.55) contrast(1.2)" : undefined,
            }}
          />
          {tint && (
            <div
              className="absolute inset-0 mix-blend-multiply"
              style={{
                background: dark
                  ? "linear-gradient(135deg, rgba(26,23,19,0.4), rgba(244,194,90,0.25))"
                  : "linear-gradient(135deg, rgba(210,146,86,0.25), rgba(201,105,85,0.2))",
              }}
            />
          )}
        </div>
      </div>
      <figcaption className="px-3 py-2 bg-paper/70 border-t border-[var(--line)]">
        <span className="overline text-[10px]">{label}</span>
        <p className="mt-0.5 text-[11px] text-ink-3">{caption}</p>
      </figcaption>
    </figure>
  );
}
