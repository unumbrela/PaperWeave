export type NodeType = "noise" | "denoise" | "output" | "timestep";

export interface DiffusionNode {
  id: string;
  layerName: string;
  type: NodeType;
  timestep?: number;
  noiseLevel?: number;
  output: number | number[][];
  inputLinks: string[];
  outputLinks: string[];
  width?: number;
  height?: number;
}

export interface DiffusionLink {
  source: string;
  dest: string;
  weight?: number;
}

export interface Diffusion {
  layers: DiffusionNode[][];
  links: DiffusionLink[];
}

export interface DrawContext {
  width: number;
  height: number;
  nodeLength: number;
  hSpaceAroundGap: number;
  vSpaceAroundGap: number;
  gapRatio: number;
}