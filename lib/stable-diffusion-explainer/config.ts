/**
 * Stable Diffusion 文生图讲解 —— 数据/配置层。
 *
 * 复用的逐步去噪帧位于 public/diffusion-sd/assets/img/<英文目录名>/，
 * 命名 `{seed}_{gs}_{timestep}.jpg`；timestep 0 = 纯噪声，50 = 成图（去噪沿 0→50）。
 * 全部帧为 256×256。
 */

export type SDPrompt = {
  /** 稳定 id（也用于 React key） */
  id: string;
  /** 资产目录名（英文，含空格/逗号，取帧时用 encodeURI 处理） */
  dir: string;
  /** 中文展示名 */
  zh: string;
  /** 原始英文 prompt（图注里展示） */
  en: string;
  /** 所属对照对的 id（KeywordCompare 用） */
  pair: string;
  /** 是否为「加了风格词」的那一张（对照对里的实验组） */
  styled: boolean;
};

/** 6 个 prompt = 3 对（每对：基础版 vs 加风格词版），与已落地的资产目录一一对应。 */
export const PROMPTS: SDPrompt[] = [
  {
    id: "bunny",
    dir: "a cute and adorable bunny, with huge clear eyes, holding a bunch of flowers",
    zh: "抱花的可爱兔子",
    en: "a cute and adorable bunny, with huge clear eyes, holding a bunch of flowers",
    pair: "bunny",
    styled: false,
  },
  {
    id: "bunny-pixar",
    dir: "a cute and adorable bunny, with huge clear eyes, holding a bunch of flowers, in the style of cute pixar character",
    zh: "抱花的兔子 · 皮克斯风",
    en: "…, in the style of cute pixar character",
    pair: "bunny",
    styled: true,
  },
  {
    id: "panda",
    dir: "a cute panda playing the guitar",
    zh: "弹吉他的熊猫",
    en: "a cute panda playing the guitar",
    pair: "panda",
    styled: false,
  },
  {
    id: "panda-forest",
    dir: "a cute panda playing the guitar in a bamboo forest",
    zh: "弹吉他的熊猫 · 竹林里",
    en: "…, in a bamboo forest",
    pair: "panda",
    styled: true,
  },
  {
    id: "castle",
    dir: "a castle by a sea",
    zh: "海边的城堡",
    en: "a castle by a sea",
    pair: "castle",
    styled: false,
  },
  {
    id: "castle-artstation",
    dir: "a castle by a sea, trending on artstation",
    zh: "海边的城堡 · artstation 热门",
    en: "…, trending on artstation",
    pair: "castle",
    styled: true,
  },
];

export type SDPair = {
  id: string;
  /** 对照对中文标题 */
  zh: string;
  /** 基础 prompt 中文 */
  baseZh: string;
  /** 加了的风格词（英文，用于高亮） */
  keyword: string;
  /** 风格词中文解释 */
  keywordZh: string;
};

export const PAIRS: SDPair[] = [
  {
    id: "bunny",
    zh: "抱花的兔子",
    baseZh: "a cute and adorable bunny…",
    keyword: "in the style of cute pixar character",
    keywordZh: "皮克斯角色风格",
  },
  {
    id: "panda",
    zh: "弹吉他的熊猫",
    baseZh: "a cute panda playing the guitar",
    keyword: "in a bamboo forest",
    keywordZh: "置身竹林",
  },
  {
    id: "castle",
    zh: "海边的城堡",
    baseZh: "a castle by a sea",
    keyword: "trending on artstation",
    keywordZh: "artstation 热门画风",
  },
];

export const SEEDS = [1, 2, 3] as const;
export type Seed = (typeof SEEDS)[number];

/** 引导强度（classifier-free guidance scale），字符串需与文件名完全一致。 */
export const GUIDANCE = ["0.0", "1.0", "7.0", "20.0"] as const;
export type Guidance = (typeof GUIDANCE)[number];

export const GUIDANCE_LABEL: Record<Guidance, string> = {
  "0.0": "0 · 完全无视提示词",
  "1.0": "1 · 微弱",
  "7.0": "7 · 常用",
  "20.0": "20 · 过强",
};

/** timestep 取值 0..50（含两端），共 51 帧；0=纯噪声，50=成图。 */
export const MAX_T = 50;
export const NUM_TIMESTEPS = MAX_T + 1;

export const IMG_BASE = "/diffusion-sd/assets/img";

/** 取某一帧的可访问 URL（目录名含空格/逗号，统一用 encodeURI）。 */
export function framePath(
  dir: string,
  seed: number,
  gs: string,
  t: number,
): string {
  return encodeURI(`${IMG_BASE}/${dir}/${seed}_${gs}_${t}.jpg`);
}

export function getPrompt(id: string): SDPrompt {
  return PROMPTS.find((p) => p.id === id) ?? PROMPTS[0];
}

export function promptsOfPair(pairId: string): {
  base: SDPrompt;
  styled: SDPrompt;
} {
  const items = PROMPTS.filter((p) => p.pair === pairId);
  return {
    base: items.find((p) => !p.styled)!,
    styled: items.find((p) => p.styled)!,
  };
}
