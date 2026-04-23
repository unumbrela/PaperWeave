import { interpolateGreys, interpolateRdBu, interpolateBrBG, interpolateOranges } from "d3";

export const layerColorScales = {
  input: [interpolateGreys, interpolateGreys, interpolateGreys] as const,
  conv: interpolateRdBu,
  relu: interpolateRdBu,
  pool: interpolateRdBu,
  fc: interpolateGreys,
  weight: interpolateBrBG,
  logit: interpolateOranges,
};

const nodeLength = 40;

export const overviewConfig = {
  nodeLength,
  plusSymbolRadius: nodeLength / 5,
  numLayers: 12,
  edgeOpacity: 0.55,
  edgeInitColor: "rgba(26, 23, 19, 0.18)",
  edgeHoverColor: "rgba(26, 23, 19, 0.75)",
  edgeHoverOuting: false,
  edgeStrokeWidth: 0.6,
  intermediateColor: "rgba(26, 23, 19, 0.35)",
  layerColorScales,
  svgPaddings: { top: 25, bottom: 25, left: 60, right: 60 },
  kernelRectLength: 8 / 3,
  gapRatio: 4,
  overlayRectOffset: 12,
  classLists: [
    "lifeboat",
    "ladybug",
    "pizza",
    "bell pepper",
    "school bus",
    "koala",
    "espresso",
    "red panda",
    "orange",
    "sport car",
  ],
  classLabels: [
    "救生艇",
    "瓢虫",
    "披萨",
    "甜椒",
    "校车",
    "考拉",
    "浓缩咖啡",
    "小熊猫",
    "橙子",
    "跑车",
  ],
} as const;

export const layerIndexDict: Record<string, number> = {
  input: 0,
  conv_1_1: 1,
  relu_1_1: 2,
  conv_1_2: 3,
  relu_1_2: 4,
  max_pool_1: 5,
  conv_2_1: 6,
  relu_2_1: 7,
  conv_2_2: 8,
  relu_2_2: 9,
  max_pool_2: 10,
  output: 11,
};

export const layerLabelsShort = [
  "input",
  "conv_1_1",
  "relu_1_1",
  "conv_1_2",
  "relu_1_2",
  "max_pool_1",
  "conv_2_1",
  "relu_2_1",
  "conv_2_2",
  "relu_2_2",
  "max_pool_2",
  "output",
];

export const layerLabelsDetailed = [
  "input(64, 64, 3)",
  "conv_1_1(62, 62, 10)",
  "relu_1_1(62, 62, 10)",
  "conv_1_2(60, 60, 10)",
  "relu_1_2(60, 60, 10)",
  "max_pool_1(30, 30, 10)",
  "conv_2_1(28, 28, 10)",
  "relu_2_1(28, 28, 10)",
  "conv_2_2(26, 26, 10)",
  "relu_2_2(26, 26, 10)",
  "max_pool_2(13, 13, 10)",
  "output(10)",
];

export const imageOptions = [
  { file: "boat_1.jpeg", class: "lifeboat", label: "救生艇" },
  { file: "bug_1.jpeg", class: "ladybug", label: "瓢虫" },
  { file: "pizza_1.jpeg", class: "pizza", label: "披萨" },
  { file: "pepper_1.jpeg", class: "bell pepper", label: "甜椒" },
  { file: "bus_1.jpeg", class: "bus", label: "校车" },
  { file: "koala_1.jpeg", class: "koala", label: "考拉" },
  { file: "espresso_1.jpeg", class: "espresso", label: "浓缩咖啡" },
  { file: "panda_1.jpeg", class: "red panda", label: "小熊猫" },
  { file: "orange_1.jpeg", class: "orange", label: "橙子" },
  { file: "car_1.jpeg", class: "sport car", label: "跑车" },
] as const;
