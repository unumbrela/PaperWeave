export type FlowDetailKind =
  | "input"
  | "patchify"
  | "fwblock"
  | "bottleneck"
  | "eaff"
  | "final_sigmoid"
  | "mask";

export type FlowRole =
  | "input"
  | "embed"
  | "encoder"
  | "bottleneck"
  | "decoder"
  | "output";

export type SkipLevel = "top" | "mid" | "low";

export interface FlowStep {
  id: string;
  label: string;
  sublabel: string;
  shapeLabel: string;
  spatial: number; // tokens per side — 真实分辨率
  channels: number; // 通道数
  depth?: number; // FW-Mamba block 堆叠数
  role: FlowRole;
  detail: FlowDetailKind;
  summary: string;
  transforms: string[];
  // 这一步是 skip 的来源（encoder）或去向（decoder）
  skipSource?: SkipLevel;
  skipTarget?: SkipLevel;
}

export const FLOW_STEPS: FlowStep[] = [
  {
    id: "input",
    label: "Input",
    sublabel: "ISIC 皮肤镜",
    shapeLabel: "256 × 256 × 3",
    spatial: 256,
    channels: 3,
    role: "input",
    detail: "input",
    summary: "一张 RGB 皮肤病变图像。我们要做的，就是把它变成一张二值掩膜，告诉医生「病变在这里」。",
    transforms: [
      "H = W = 256, 通道 = RGB",
      "输入归一化到 [0, 1]",
      "即将被拆成 64 × 64 个 patch",
    ],
  },
  {
    id: "patch_embed",
    label: "Patch Embed",
    sublabel: "stride = 4",
    shapeLabel: "64 × 64 × 96",
    spatial: 64,
    channels: 96,
    role: "embed",
    detail: "patchify",
    summary: "每个 4×4 像素块过一次线性投影，变成一个 96 维 token。256² 像素压成 64² 个 token，信息密度从像素级跳到 patch 级。",
    transforms: [
      "Conv2d(3 → 96, kernel = 4, stride = 4)",
      "空间 ↓ 4×，通道 ↑ 32×",
      "输出排布：(B, 64, 64, 96) HWC 张量",
    ],
  },
  {
    id: "enc1",
    label: "Encoder 1",
    sublabel: "FW-Mamba × 2",
    shapeLabel: "64 × 64 × 96",
    spatial: 64,
    channels: 96,
    depth: 2,
    role: "encoder",
    detail: "fwblock",
    summary: "2 个 FW-Mamba Block 串联。SS2D 分支扫全局语义，DWT 分支拆出 LL/LH/HL/HH 四个频带——皮肤纹理的高频边缘在这层最丰富。",
    transforms: [
      "两条分支并行：SS2D + DWT",
      "可学习融合权重 β (init 0.1)",
      "PatchMerging → 32 × 32 × 192",
    ],
    skipSource: "low",
  },
  {
    id: "enc2",
    label: "Encoder 2",
    sublabel: "FW-Mamba × 2",
    shapeLabel: "32 × 32 × 192",
    spatial: 32,
    channels: 192,
    depth: 2,
    role: "encoder",
    detail: "fwblock",
    summary: "分辨率减半、通道翻倍。每个 token 的感受野变大，开始聚合「这是一块什么样的区域」而不是「这是什么像素」。",
    transforms: [
      "depth = 2, dim = 192",
      "DWT 高频带仍保留边缘信息",
      "PatchMerging → 16 × 16 × 384",
    ],
    skipSource: "mid",
  },
  {
    id: "enc3",
    label: "Encoder 3",
    sublabel: "FW-Mamba × 9",
    shapeLabel: "16 × 16 × 384",
    spatial: 16,
    channels: 384,
    depth: 9,
    role: "encoder",
    detail: "fwblock",
    summary: "最厚的一层——9 个 FW-Block 堆叠。网络在这里建模长程上下文：病变相对皮肤的整体位置、形状、明暗对比都被编码成语义向量。",
    transforms: [
      "depth = 9（最深）, dim = 384",
      "深层 β 通常较小——语义为主",
      "PatchMerging → 8 × 8 × 768",
    ],
    skipSource: "top",
  },
  {
    id: "bottleneck",
    label: "Bottleneck",
    sublabel: "最小最深",
    shapeLabel: "8 × 8 × 768",
    spatial: 8,
    channels: 768,
    depth: 2,
    role: "bottleneck",
    detail: "bottleneck",
    summary: "整个 U-Net 的底。8×8 = 64 个 token，每个 token 编码了整张图的一个区域的「是什么」。从这里开始反向展开，把抽象语义重新铺回像素。",
    transforms: [
      "depth = 2, dim = 768",
      "空间最小、通道最多",
      "不做 skip，直接进 Decoder 1",
    ],
  },
  {
    id: "dec2",
    label: "Decoder 2",
    sublabel: "EAFF-Skip · top",
    shapeLabel: "16 × 16 × 384",
    spatial: 16,
    channels: 384,
    role: "decoder",
    detail: "eaff",
    summary: "PatchExpand 把 8×8×768 展成 16×16×384。EAFFSkip 把 Encoder 3 的特征融进来——对 skip 特征再做一次 DWT 取高频，得到边缘注意力图，在轮廓处重新点亮细节。",
    transforms: [
      "PatchExpand ×2：8 → 16",
      "fused = dec + enc + edge_attn · enc",
      "再过 2 个 FW-Mamba Block 精炼",
    ],
    skipTarget: "top",
  },
  {
    id: "dec3",
    label: "Decoder 3",
    sublabel: "EAFF-Skip · mid",
    shapeLabel: "32 × 32 × 192",
    spatial: 32,
    channels: 192,
    role: "decoder",
    detail: "eaff",
    summary: "16 → 32 上采。随着分辨率回升，每个 token 负责的像素区域变小，decoder 越来越依赖 skip 带来的「位置记忆」，不然容易把边缘涂糊。",
    transforms: [
      "PatchExpand ×2：16 → 32",
      "融合 Encoder 2 的 skip",
      "dim = 192",
    ],
    skipTarget: "mid",
  },
  {
    id: "dec4",
    label: "Decoder 4",
    sublabel: "EAFF-Skip · low",
    shapeLabel: "64 × 64 × 96",
    spatial: 64,
    channels: 96,
    role: "decoder",
    detail: "eaff",
    summary: "32 → 64 上采。此时特征已经很「低级」——接近原像素的线性组合，是最终落笔的关键一步。EAFFSkip 的边缘注意力通常在这里最强。",
    transforms: [
      "PatchExpand ×2：32 → 64",
      "融合 Encoder 1 的浅层 skip",
      "dim = 96",
    ],
    skipTarget: "low",
  },
  {
    id: "final",
    label: "Final Expand",
    sublabel: "PatchExpand ×4 + 1×1",
    shapeLabel: "256 × 256 × 1",
    spatial: 256,
    channels: 1,
    role: "output",
    detail: "final_sigmoid",
    summary: "Final_PatchExpand(×4) 把 64² 铺回 256²，再用 1×1 Conv 压成单通道 logit。sigmoid + 阈值 0.5 就得到二值掩膜。",
    transforms: [
      "PatchExpand ×4：64 → 256",
      "Conv2d(24 → 1)",
      "sigmoid → 概率图",
    ],
  },
  {
    id: "output",
    label: "Output",
    sublabel: "binary mask",
    shapeLabel: "256 × 256",
    spatial: 256,
    channels: 1,
    role: "output",
    detail: "mask",
    summary: "二值化后的分割掩膜。与医生手工标注（GT）对比算 Dice / IoU——越接近 1 越贴合真实边界。",
    transforms: [
      "threshold 0.5 → {0, 1}",
      "对比 GT 算 Dice / IoU",
      "叠到原图得 overlay 热力图",
    ],
  },
];

// 三条 EAFF skip：从哪个 enc 连到哪个 dec
export interface SkipArc {
  level: SkipLevel;
  from: string; // step id
  to: string;
  color: string;
  label: string;
}

export const SKIP_ARCS: SkipArc[] = [
  { level: "top", from: "enc3", to: "dec2", color: "#d29256", label: "skip-top" },
  { level: "mid", from: "enc2", to: "dec3", color: "#c98a55", label: "skip-mid" },
  { level: "low", from: "enc1", to: "dec4", color: "#b07746", label: "skip-low" },
];

export const ROLE_COLORS: Record<
  FlowRole,
  { bg: string; border: string; text: string; accent: string }
> = {
  input: {
    bg: "#f1e7d3",
    border: "#b09361",
    text: "#1a1713",
    accent: "#b09361",
  },
  embed: {
    bg: "#e4dfe4",
    border: "#8f79b0",
    text: "#1a1713",
    accent: "#8f79b0",
  },
  encoder: {
    bg: "#d6dfe9",
    border: "#6b8ed6",
    text: "#1a1713",
    accent: "#6b8ed6",
  },
  bottleneck: {
    bg: "#1a1713",
    border: "#1a1713",
    text: "#f1e7d3",
    accent: "#f4c25a",
  },
  decoder: {
    bg: "#ead9c7",
    border: "#d29256",
    text: "#1a1713",
    accent: "#d29256",
  },
  output: {
    bg: "#e3d4d1",
    border: "#c96955",
    text: "#1a1713",
    accent: "#c96955",
  },
};
