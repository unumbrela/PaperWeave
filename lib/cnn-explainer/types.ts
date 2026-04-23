export type NodeType =
  | "input"
  | "conv"
  | "pool"
  | "relu"
  | "fc"
  | "flatten";

export type Scalar1D = number[];
export type Scalar2D = number[][];
export type Scalar3D = number[][][];
export type Scalar4D = number[][][][];

export interface CNNLink {
  source: CNNNode;
  dest: CNNNode;
  weight: number | Scalar1D | Scalar2D | [number, number] | null;
}

export interface CNNNode {
  layerName: string;
  index: number;
  realIndex?: number;
  type: NodeType;
  bias: number;
  output: number | Scalar2D;
  logit?: number;
  inputLinks: CNNLink[];
  outputLinks: CNNLink[];
}

export type CNN = CNNNode[][] & { flatten?: CNNNode[] };

export type ScaleLevel = "local" | "module" | "global";

export interface LayerRanges {
  local: number[];
  module: number[];
  global: number[];
}

export interface LayerMinMax {
  min: number;
  max: number;
}
