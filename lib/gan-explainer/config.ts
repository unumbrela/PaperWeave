import { interpolateGreys, interpolateRdBu, interpolateBrBG, interpolateOranges, interpolateViridis, interpolatePuOr } from "d3";

export const layerColorScales = {
  noise: interpolateGreys,
  generator: interpolateViridis,
  generatorLayer: interpolateRdBu,
  discriminator: interpolateOranges,
  discriminatorLayer: interpolateBrBG,
  output: interpolatePuOr,
  loss: interpolateRdBu,
};

const nodeLength = 40;

export const overviewConfig = {
  nodeLength,
  plusSymbolRadius: nodeLength / 5,
  numLayers: 10,
  edgeOpacity: 0.4,
  edgeInitColor: "rgba(26, 23, 19, 0.15)",
  edgeHoverColor: "rgba(26, 23, 19, 0.7)",
  gradientEdgeColor: "#ef4444",
  residualEdgeColor: "#22c55e",
  edgeStrokeWidth: 0.5,
  gradientStrokeWidth: 1.5,
  svgPaddings: { top: 50, bottom: 60, left: 80, right: 80 },
  gapRatio: 3,
  latentDim: 100,
  imageSize: 64,
  channels: 3,
} as const;

export const layerIndexDict: Record<string, number> = {
  noise: 0,
  gen_1: 1,
  gen_2: 2,
  gen_3: 3,
  generated: 4,
  real: 5,
  disc_1: 6,
  disc_2: 7,
  disc_3: 8,
  output: 9,
};

export const layerLabelsShort = [
  "Noise",
  "Gen_1",
  "Gen_2",
  "Gen_3",
  "Generated",
  "Real",
  "Disc_1",
  "Disc_2",
  "Disc_3",
  "Output",
];

export const layerLabelsDetailed = [
  "Noise(100)",
  "Gen_1(128, 4×4)",
  "Gen_2(64, 8×8)",
  "Gen_3(32, 16×16)",
  "Generated(3, 64×64)",
  "Real(3, 64×64)",
  "Disc_1(64, 32×32)",
  "Disc_2(128, 16×16)",
  "Disc_3(256, 8×8)",
  "Output(1)",
];

export const exampleLatentVectors = [
  { label: "人脸", noise: Array(100).fill(0).map(() => Math.random() * 2 - 1) },
  { label: "猫", noise: Array(100).fill(0).map(() => Math.random() * 2 - 1) },
  { label: "狗", noise: Array(100).fill(0).map(() => Math.random() * 2 - 1) },
  { label: "汽车", noise: Array(100).fill(0).map(() => Math.random() * 2 - 1) },
] as const;