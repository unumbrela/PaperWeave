export type NodeType =
  | "input"
  | "embedding"
  | "multihead-attention"
  | "layer-norm"
  | "feed-forward"
  | "output";

export type Scalar1D = number[];
export type Scalar2D = number[][];
export type Scalar3D = number[][][];

export interface TransformerLink {
  source: TransformerNode;
  dest: TransformerNode;
  weight: number | Scalar2D | null;
  attentionScore?: number;
  isResidual?: boolean;
}

export interface TransformerNode {
  layerName: string;
  index: number;
  headIndex?: number;
  type: NodeType;
  output: number | Scalar2D;
  inputLinks: TransformerLink[];
  outputLinks: TransformerLink[];
  attentionWeights?: Scalar2D;
  hasResidual?: boolean;
}

export type Transformer = TransformerNode[][];

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

export interface AttentionHead {
  index: number;
  scores: Scalar2D;
  output: Scalar2D;
}

export interface TransformerConfig {
  numLayers: number;
  numHeads: number;
  hiddenSize: number;
  sequenceLength: number;
}