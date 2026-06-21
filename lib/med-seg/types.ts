export type StageId =
  | "patch_embed"
  | "enc1"
  | "enc2"
  | "enc3"
  | "bottleneck"
  | "dec2"
  | "dec3"
  | "dec4"
  | "final";

export interface StageInfo {
  id: StageId;
  label: string;
  role: "input" | "encoder" | "bottleneck" | "decoder" | "output";
  shape: [number, number, number];
  depth?: number;
}

export interface DWTBands {
  ll: string;
  lh: string;
  hl: string;
  hh: string;
}

export interface FWBlockRecord {
  stageId: StageId;
  beta: number;
  alphaLow: number;
  alphaHigh: number;
  mamba: string;
  freq: string;
  fused: string;
  dwt: DWTBands;
}

export interface EAFFRecord {
  level: "top" | "mid" | "low";
  enc: string;
  dec: string;
  edge: string;
  fused: string;
}

export interface StageRecord {
  id: StageId;
  channels: string[];
}

export interface SampleRecord {
  id: string;
  input: string;
  gt: string;
  fwmambaPred: string;
  vmunetPred?: string;
  overlay?: string;
  dice: number;
  iou: number;
  diceBaseline?: number;
  iouBaseline?: number;
  stages?: StageRecord[];
  fwBlocks?: FWBlockRecord[];
  eaff?: EAFFRecord[];
}

export interface Manifest {
  classLabel: string;
  inputSize: [number, number];
  stages: StageInfo[];
  samples: SampleRecord[];
}

export interface LegacySample {
  id: string;
  /** intrinsic size of the source photo */
  w: number;
  h: number;
  input: string;
  gt: string;
  pred: string;
  overlay: string;
  edgeAttn: string;
  /** 96² gallery + canvas thumbnail */
  thumb: string;
  dwt: DWTBands;
  /** base64 LQIP data URLs for placeholder="blur" */
  blur: { input: string; overlay: string };
  dice: number;
  iou: number;
}
