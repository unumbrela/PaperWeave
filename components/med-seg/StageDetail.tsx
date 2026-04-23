"use client";

import { stageMeta } from "@/lib/med-seg/legacy-samples";
import type { StageId } from "@/lib/med-seg/types";
import { cn } from "@/lib/utils";

const STAGE_INFO: Record<
  StageId,
  { title: string; body: string; hl: string[] }
> = {
  patch_embed: {
    title: "Patch Embed · 第一块砖",
    body: "256×256×3 的 RGB 图像被拆成 64×64 个 4×4 的 patch，每个 patch 过一次线性投影得到 96 维向量。 不同于 CNN 的细粒度卷积，Mamba 系列从一开始就用 stride-4 的大步长下采样，把 token 数量压到可控规模。",
    hl: [
      "patch_size = 4 · stride = 4",
      "in_channels = 3 → embed_dim = 96",
      "输出排布：(B, 64, 64, 96) 的 HWC 张量",
    ],
  },
  enc1: {
    title: "Encoder 1 · 2 × FW-Mamba Block",
    body: "2 个 FW-Mamba 块串联，维度保持 96。每块内部并行跑 SS2D（Mamba）和 DWT 频率分支，融合权重 β 从 0.1 起步可学习。 这个阶段的小波高频分量携带最多的边缘/纹理信号——皮肤病变的表面结构就在这里被捕获。",
    hl: [
      "depth = 2 · dim = 96 · d_state = 16",
      "DWT 分解：64×64 → 32×32 四频带",
      "出口：PatchMerging → 32×32×192",
    ],
  },
  enc2: {
    title: "Encoder 2 · 中层语义",
    body: "继续 2 个 FW-Mamba 块，维度翻倍到 192。空间分辨率减半为 32×32，每个 token 看到的感受野变大，开始聚合局部纹理为「这是一块什么样的区域」。EAFF-Skip 记录此时的特征用于后续解码。",
    hl: [
      "depth = 2 · dim = 192",
      "承接 skip[1] → 解码器 Dec 3",
      "出口：PatchMerging → 16×16×384",
    ],
  },
  enc3: {
    title: "Encoder 3 · 深度堆叠",
    body: "这一层最「厚」——堆 9 个 FW-Mamba 块，维度 384。这里是网络真正在建模长程上下文的地方：病变相对于皮肤的整体位置、形状、明暗对比都在这一层被编码。深层特征几乎是语义性的，边缘信息相对少，β 权重通常会被学得更小。",
    hl: [
      "depth = 9 · dim = 384（最深）",
      "承接 skip[2] → 解码器 Dec 2",
      "出口：PatchMerging → 8×8×768",
    ],
  },
  bottleneck: {
    title: "Bottleneck · 最小最深",
    body: "8×8 空间尺寸、768 通道，总共 2 个 FW-Mamba 块。这是整个 U-Net 的「瓶颈」——分辨率最低、语义最抽象。从这里开始，网络要反向展开：把高度压缩的语义向量重新铺回 256×256 的像素空间。",
    hl: [
      "depth = 2 · dim = 768",
      "8×8 = 64 个 token，最粗粒度",
      "不做 skip，直接进 Decoder 1",
    ],
  },
  dec2: {
    title: "Decoder 2 · 首次上采",
    body: "PatchExpand 把 8×8×768 变成 16×16×384，然后 EAFFSkip 把 encoder 3 的特征融进来——重点是利用 DWT 提取的边缘注意力，在轮廓处重新点亮高频细节。 之后 2 个 FW-Mamba 块做精炼。",
    hl: [
      "EAFF-Skip · level = top",
      "PatchExpand ×2 · 8→16",
      "fused = dec + enc + edge_attn · enc",
    ],
  },
  dec3: {
    title: "Decoder 3 · 中分辨率",
    body: "16 → 32 的上采样；融合 encoder 2 的 skip。随着分辨率回升，每个 token 代表的像素区域变小，decoder 更依赖 skip 带来的「位置记忆」。EAFF-Skip 在这里防止模型把边缘「涂糊」——这是轻量频率损失锦上添花的地方。",
    hl: [
      "EAFF-Skip · level = mid",
      "PatchExpand ×2 · 16→32",
      "dim = 192",
    ],
  },
  dec4: {
    title: "Decoder 4 · 贴近像素",
    body: "32 → 64 上采样；融合 encoder 1（最浅）的 skip。此时 decoder 的特征已经非常「低级」——几乎等价于原始像素的线性组合，是最终落笔的关键一步。EAFFSkip 的边缘注意力在此处通常最强。",
    hl: [
      "EAFF-Skip · level = low",
      "PatchExpand ×2 · 32→64",
      "dim = 96",
    ],
  },
  final: {
    title: "Final · 重返 256×256",
    body: "Final_PatchExpand(×4) 把 64×64×96 铺成 256×256×24，然后 1×1 卷积压成单通道 logit。 外面套 sigmoid、用 0.5 阈值二值化就是预测掩膜。 对比 GT 得 Dice / IoU。",
    hl: [
      "PatchExpand ×4 · 64→256",
      "Conv2d(24 → 1)",
      "sigmoid → threshold 0.5",
    ],
  },
};

interface Props {
  stageId: StageId;
}

export function StageDetail({ stageId }: Props) {
  const info = STAGE_INFO[stageId];
  const meta = stageMeta.find((s) => s.id === stageId);
  if (!info || !meta) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <div className="overline" style={{ color: "#6b8ed6" }}>
            Stage · {meta.label}
          </div>
          <h3 className="serif text-[20px] text-ink mt-0.5">{info.title}</h3>
        </div>
        <div className="text-right text-[11.5px] text-ink-3 font-mono tabular-nums">
          {meta.shape[0]} × {meta.shape[1]} × {meta.shape[2]}
          {meta.depth && (
            <span className="block mt-0.5">blocks = {meta.depth}</span>
          )}
        </div>
      </div>

      <p className="text-[14px] leading-relaxed text-ink-2">{info.body}</p>

      <div className="flex flex-wrap gap-1.5">
        {info.hl.map((h) => (
          <span
            key={h}
            className={cn(
              "inline-flex items-center rounded-full border border-[var(--line)]",
              "px-2.5 py-1 text-[11px] text-ink-2 bg-paper/60",
            )}
          >
            {h}
          </span>
        ))}
      </div>
    </div>
  );
}
