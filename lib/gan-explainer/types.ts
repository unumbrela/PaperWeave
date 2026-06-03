export type NodeType =
  | "noise"
  | "generator"
  | "generator-layer"
  | "generated-image"
  | "real-image"
  | "discriminator"
  | "discriminator-layer"
  | "output"
  | "loss";

export type Scalar1D = number[];
export type Scalar2D = number[][];
export type Scalar3D = number[][][];

export interface GANLink {
  source: GANNode;
  dest: GANNode;
  weight: number | Scalar2D | null;
  isGradient?: boolean;
  direction?: "forward" | "backward";
}

export interface GANNode {
  layerName: string;
  index: number;
  type: NodeType;
  output: number | Scalar2D;
  inputLinks: GANLink[];
  outputLinks: GANLink[];
  featureMap?: Scalar3D;
  lossValue?: number;
  iteration?: number;
}

export type GAN = GANNode[][];

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

export interface TrainingStats {
  generatorLoss: number[];
  discriminatorLoss: number[];
  iteration: number;
}

export interface GANConfig {
  latentDim: number;
  imageSize: number;
  channels: number;
  generatorLayers: number;
  discriminatorLayers: number;
}