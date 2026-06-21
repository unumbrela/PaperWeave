import type { LegacySample } from "./types";
import { MED_SEG_ASSETS } from "./manifest.generated";

// dice/iou are the human-curated source of truth; asset paths / dimensions /
// blur placeholders come from the generated manifest (see scripts/optimize-med-seg.mjs).
const metrics: Record<string, { dice: number; iou: number }> = {
  s0: { dice: 0.816, iou: 0.6892 },
  s100: { dice: 0.8751, iou: 0.778 },
  s200: { dice: 0.8373, iou: 0.7201 },
  s300: { dice: 0.8859, iou: 0.7952 },
  s400: { dice: 0.8955, iou: 0.8108 },
  s500: { dice: 0.9508, iou: 0.9062 },
  s600: { dice: 0.8312, iou: 0.7111 },
  s700: { dice: 0.9091, iou: 0.8334 },
  s800: { dice: 0.8974, iou: 0.8138 },
};

export const legacySamples: LegacySample[] = MED_SEG_ASSETS.map((a) => ({
  id: a.id,
  w: a.w,
  h: a.h,
  input: a.input,
  gt: a.gt,
  pred: a.pred,
  overlay: a.overlay,
  edgeAttn: a.edgeAttn,
  thumb: a.thumb,
  dwt: a.dwt,
  blur: a.blur,
  dice: metrics[a.id]?.dice ?? 0,
  iou: metrics[a.id]?.iou ?? 0,
}));

import type { StageId } from "./types";

export interface StageMetaEntry {
  id: StageId;
  label: string;
  role: "input" | "encoder" | "bottleneck" | "decoder" | "output";
  shape: [number, number, number];
  depth?: number;
}

export const stageMeta: StageMetaEntry[] = [
  { id: "patch_embed", label: "Patch Embed", role: "input", shape: [64, 64, 96] },
  { id: "enc1", label: "Encoder 1", role: "encoder", shape: [64, 64, 96], depth: 2 },
  { id: "enc2", label: "Encoder 2", role: "encoder", shape: [32, 32, 192], depth: 2 },
  { id: "enc3", label: "Encoder 3", role: "encoder", shape: [16, 16, 384], depth: 9 },
  { id: "bottleneck", label: "Bottleneck", role: "bottleneck", shape: [8, 8, 768], depth: 2 },
  { id: "dec2", label: "Decoder 2", role: "decoder", shape: [16, 16, 384] },
  { id: "dec3", label: "Decoder 3", role: "decoder", shape: [32, 32, 192] },
  { id: "dec4", label: "Decoder 4", role: "decoder", shape: [64, 64, 96] },
  { id: "final", label: "Final", role: "output", shape: [256, 256, 1] },
];
