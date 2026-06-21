// 玩具 Transformer 的配置：尺寸、词表、例句、颜色、bigram 偏置。
// 一切为「示意性合成数据」服务——数字由确定性玩具模型真实算出（自洽），
// 仅用 bigram 偏置把预设例句的 Top-1 下一个词「掰」得通顺。

export const DIMS = {
  D_MODEL: 24,
  N_HEADS: 3,
  D_HEAD: 8, // N_HEADS * D_HEAD = D_MODEL
  N_BLOCKS: 2,
  D_FF: 48,
} as const;

export const SEED = 20240611;

// 主色（沿用展厅暖色系中的海蓝），与各阶段标识色。
export const ACCENT = "#3b6ef6";
export const STAGE_COLORS = {
  token: "#7a736a",
  embedding: "#8854d0",
  attention: "#3b6ef6",
  multihead: "#ff5d4d",
  ffn: "#6b9b6f",
  output: "#f4c25a",
} as const;
// 多头各头的区分色。
export const HEAD_COLORS = ["#3b6ef6", "#ff5d4d", "#8854d0"] as const;

// 玩具词表（小写英文 + 标点）。索引即 token id。
export const VOCAB = [
  "the", "cat", "sat", "on", "mat",
  "attention", "is", "all", "you", "need",
  "machine", "learning", "so", "fun", "i",
  "love", "deep", "quick", "brown", "fox",
  "jumps", "dog", "runs", "over", "lazy",
  "a", "of", "to", "and", "model",
  "data", "neural", "network", "language", "transformer",
  "are", "great", "good", "smart", "powerful",
  "hard", "easy", "math", "code", "world",
  "hello", "then", "now", "here", "very",
] as const;

export const VOCAB_INDEX: Record<string, number> = Object.fromEntries(
  VOCAB.map((w, i) => [w, i]),
);

export interface Sentence {
  id: string;
  label: string;
  words: string[];
}

// 例句的每个词都在词表内；末词经 bigram 偏置后会给出合理的下一个词。
export const SENTENCES: Sentence[] = [
  { id: "cat", label: "the cat sat on the", words: ["the", "cat", "sat", "on", "the"] },
  { id: "attn", label: "attention is all you", words: ["attention", "is", "all", "you"] },
  { id: "ml", label: "machine learning is so", words: ["machine", "learning", "is", "so"] },
  { id: "deep", label: "i love deep", words: ["i", "love", "deep"] },
  { id: "fox", label: "the quick brown fox", words: ["the", "quick", "brown", "fox"] },
];

// bigram 偏置：当最后一个词为 key 时，给目标词的 logit 加 BIGRAM_BONUS。
export const BIGRAM_BONUS = 11;
export const BIGRAM: Record<string, string> = {
  the: "mat",
  you: "need",
  so: "fun",
  deep: "learning",
  fox: "jumps",
};

export const TEMPERATURE = { min: 0.1, max: 2, default: 0.9, step: 0.05 } as const;
export const TOP_K = 6;
