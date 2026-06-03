import { interpolateGreys, interpolateRdBu, interpolateBrBG, interpolateOranges, interpolateViridis } from "d3";

export const layerColorScales = {
  input: interpolateGreys,
  embedding: interpolateRdBu,
  attention: interpolateBrBG,
  layerNorm: interpolateGreys,
  feedForward: interpolateViridis,
  output: interpolateOranges,
  weight: interpolateBrBG,
};

const nodeLength = 36;

export const overviewConfig = {
  nodeLength,
  plusSymbolRadius: nodeLength / 5,
  numLayers: 11,
  edgeOpacity: 0.3,
  edgeInitColor: "rgba(26, 23, 19, 0.15)",
  edgeHoverColor: "rgba(26, 23, 19, 0.7)",
  residualEdgeColor: "#22c55e",
  residualEdgeWidth: 2,
  edgeHoverOuting: false,
  edgeStrokeWidth: 0.5,
  intermediateColor: "rgba(26, 23, 19, 0.3)",
  layerColorScales,
  svgPaddings: { top: 40, bottom: 50, left: 80, right: 80 },
  gapRatio: 2.5,
  overlayRectOffset: 10,
  numHeads: 4,
  sequenceLength: 8,
} as const;

export const layerIndexDict: Record<string, number> = {
  input: 0,
  embedding: 1,
  encoder_1_mha: 2,
  encoder_1_norm1: 3,
  encoder_1_ffn: 4,
  encoder_1_norm2: 5,
  encoder_2_mha: 6,
  encoder_2_norm1: 7,
  encoder_2_ffn: 8,
  encoder_2_norm2: 9,
  output: 10,
};

export const layerLabelsShort = [
  "Input",
  "Embedding",
  "MHA_1",
  "Norm_1",
  "FFN_1",
  "Norm_2",
  "MHA_2",
  "Norm_3",
  "FFN_2",
  "Norm_4",
  "Output",
];

export const layerLabelsDetailed = [
  "Input(8, 512)",
  "Embedding(8, 512)",
  "MHA_1(8, 512)",
  "Norm_1(8, 512)",
  "FFN_1(8, 512)",
  "Norm_2(8, 512)",
  "MHA_2(8, 512)",
  "Norm_3(8, 512)",
  "FFN_2(8, 512)",
  "Norm_4(8, 512)",
  "Output(8, 512)",
];

export const exampleSentences = [
  { text: "The quick brown fox", label: "示例句子 1" },
  { text: "Machine learning is fun", label: "示例句子 2" },
  { text: "Transformers are powerful", label: "示例句子 3" },
  { text: "Attention is all you need", label: "示例句子 4" },
] as const;