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

export const imageOptions = [
  { file: "boat_1.jpeg", label: "救生艇" },
  { file: "bug_1.jpeg", label: "瓢虫" },
  { file: "pizza_1.jpeg", label: "披萨" },
  { file: "pepper_1.jpeg", label: "甜椒" },
  { file: "bus_1.jpeg", label: "校车" },
  { file: "koala_1.jpeg", label: "考拉" },
  { file: "espresso_1.jpeg", label: "浓缩咖啡" },
  { file: "panda_1.jpeg", label: "小熊猫" },
  { file: "orange_1.jpeg", label: "橙子" },
  { file: "car_1.jpeg", label: "跑车" },
] as const;
