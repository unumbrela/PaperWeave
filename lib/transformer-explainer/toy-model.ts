// 确定性玩具 Transformer：固定种子生成权重，真实计算
// 词嵌入 → 位置编码 → (QKV → 因果掩码自注意力 → 多头拼接 → Wo → Add&LN → FFN → Add&LN) ×N
// → 末端 LN → 权重共享 unembedding + bigram 偏置 → softmax。
// 数字自洽（每一步都是真算的），仅末端用 bigram 偏置把例句的下一个词掰通顺。

import {
  DIMS,
  SEED,
  VOCAB,
  VOCAB_INDEX,
  BIGRAM,
  BIGRAM_BONUS,
  TOP_K,
  type Sentence,
} from "./config";
import type { BlockTrace, ForwardTrace, HeadTrace, Matrix, Vector } from "./types";

const { D_MODEL, N_HEADS, D_HEAD, N_BLOCKS, D_FF } = DIMS;
const V = VOCAB.length;

// ── 确定性随机 ──────────────────────────────────────────
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRandn(rng: () => number) {
  // Box–Muller
  return (std: number): number => {
    const u = Math.max(rng(), 1e-9);
    const v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std;
  };
}

function randMatrix(rows: number, cols: number, std: number, randn: (s: number) => number): Matrix {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => randn(std)),
  );
}

// ── 线性代数小工具 ──────────────────────────────────────
function matmul(a: Matrix, b: Matrix): Matrix {
  const n = a.length;
  const m = b[0].length;
  const k = b.length;
  const out: Matrix = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    for (let p = 0; p < k; p++) {
      const aip = a[i][p];
      const brow = b[p];
      for (let j = 0; j < m; j++) out[i][j] += aip * brow[j];
    }
  }
  return out;
}

function addBias(a: Matrix, bias: Vector): Matrix {
  return a.map((row) => row.map((x, j) => x + bias[j]));
}

function addMatrix(a: Matrix, b: Matrix): Matrix {
  return a.map((row, i) => row.map((x, j) => x + b[i][j]));
}

function sliceCols(a: Matrix, start: number, end: number): Matrix {
  return a.map((row) => row.slice(start, end));
}

function transpose(a: Matrix): Matrix {
  return a[0].map((_, j) => a.map((row) => row[j]));
}

function gelu(x: number): number {
  return 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));
}

function layerNorm(a: Matrix): Matrix {
  const eps = 1e-5;
  return a.map((row) => {
    const mean = row.reduce((s, x) => s + x, 0) / row.length;
    const variance = row.reduce((s, x) => s + (x - mean) ** 2, 0) / row.length;
    const denom = Math.sqrt(variance + eps);
    return row.map((x) => (x - mean) / denom);
  });
}

export function softmax(xs: Vector, temperature = 1): Vector {
  const t = Math.max(temperature, 1e-6);
  const scaled = xs.map((x) => x / t);
  const max = Math.max(...scaled);
  const exps = scaled.map((x) => Math.exp(x - max));
  const sum = exps.reduce((s, x) => s + x, 0);
  return exps.map((x) => x / sum);
}

// 因果掩码的逐行 softmax（列 > 行 的位置被屏蔽）。
function maskedRowSoftmax(scores: Matrix): Matrix {
  return scores.map((row, i) => {
    const allowed = row.map((x, j) => (j <= i ? x : -Infinity));
    const max = Math.max(...allowed.filter((x) => x !== -Infinity));
    const exps = allowed.map((x) => (x === -Infinity ? 0 : Math.exp(x - max)));
    const sum = exps.reduce((s, x) => s + x, 0) || 1;
    return exps.map((x) => x / sum);
  });
}

// ── 权重（确定性，模块级缓存一次） ───────────────────────
interface BlockWeights {
  wq: Matrix;
  wk: Matrix;
  wv: Matrix;
  wo: Matrix;
  w1: Matrix;
  b1: Vector;
  w2: Matrix;
  b2: Vector;
}

interface Weights {
  embedding: Matrix; // V × D_MODEL（同时用于 unembedding，权重共享）
  blocks: BlockWeights[];
}

let cachedWeights: Weights | null = null;

function buildWeights(): Weights {
  const rng = mulberry32(SEED);
  const randn = makeRandn(rng);
  const embedding = randMatrix(V, D_MODEL, 0.55, randn);
  const blocks: BlockWeights[] = [];
  for (let b = 0; b < N_BLOCKS; b++) {
    const proj = () => randMatrix(D_MODEL, D_MODEL, 1 / Math.sqrt(D_MODEL), randn);
    blocks.push({
      wq: proj(),
      wk: proj(),
      wv: proj(),
      wo: proj(),
      w1: randMatrix(D_MODEL, D_FF, 1 / Math.sqrt(D_MODEL), randn),
      b1: new Array(D_FF).fill(0),
      w2: randMatrix(D_FF, D_MODEL, 1 / Math.sqrt(D_FF), randn),
      b2: new Array(D_MODEL).fill(0),
    });
  }
  return { embedding, blocks };
}

function getWeights(): Weights {
  if (!cachedWeights) cachedWeights = buildWeights();
  return cachedWeights;
}

// ── 位置编码（正弦） ─────────────────────────────────────
export function positionalEncoding(seq: number, d: number): Matrix {
  const out: Matrix = Array.from({ length: seq }, () => new Array(d).fill(0));
  for (let pos = 0; pos < seq; pos++) {
    for (let i = 0; i < d; i++) {
      const k = Math.floor(i / 2);
      const denom = Math.pow(10000, (2 * k) / d);
      out[pos][i] = i % 2 === 0 ? Math.sin(pos / denom) : Math.cos(pos / denom);
    }
  }
  return out;
}

// ── 分词 ────────────────────────────────────────────────
export function tokenize(words: string[]): number[] {
  return words.map((w) => VOCAB_INDEX[w] ?? 0);
}

// ── 单个 Block 前向 ─────────────────────────────────────
function runBlock(x: Matrix, w: BlockWeights): BlockTrace {
  const seq = x.length;
  const q = matmul(x, w.wq);
  const k = matmul(x, w.wk);
  const v = matmul(x, w.wv);

  const heads: HeadTrace[] = [];
  const concat: Matrix = Array.from({ length: seq }, () => new Array(D_MODEL).fill(0));
  for (let h = 0; h < N_HEADS; h++) {
    const s = h * D_HEAD;
    const e = s + D_HEAD;
    const qh = sliceCols(q, s, e);
    const kh = sliceCols(k, s, e);
    const vh = sliceCols(v, s, e);
    const raw = matmul(qh, transpose(kh)).map((row) => row.map((x2) => x2 / Math.sqrt(D_HEAD)));
    const scores = maskedRowSoftmax(raw);
    const out = matmul(scores, vh);
    heads.push({ q: qh, k: kh, v: vh, scores, out });
    for (let i = 0; i < seq; i++) {
      for (let j = 0; j < D_HEAD; j++) concat[i][s + j] = out[i][j];
    }
  }

  const attnOut = matmul(concat, w.wo);
  const afterAttnNorm = layerNorm(addMatrix(x, attnOut));

  const ffnHidden = addBias(matmul(afterAttnNorm, w.w1), w.b1).map((row) => row.map(gelu));
  const ffnOut = addBias(matmul(ffnHidden, w.w2), w.b2);
  const output = layerNorm(addMatrix(afterAttnNorm, ffnOut));

  return { heads, mhaConcat: concat, attnOut, afterAttnNorm, ffnHidden, ffnOut, output };
}

// ── 完整前向 ────────────────────────────────────────────
export function runForward(sentence: Sentence, temperature: number): ForwardTrace {
  const w = getWeights();
  const tokens = tokenize(sentence.words);
  const seq = tokens.length;

  const embeddings = tokens.map((t) => w.embedding[t].slice());
  const posEncoding = positionalEncoding(seq, D_MODEL);
  const posEncoded = addMatrix(embeddings, posEncoding);

  const blocks: BlockTrace[] = [];
  let x = posEncoded;
  for (let b = 0; b < N_BLOCKS; b++) {
    const trace = runBlock(x, w.blocks[b]);
    blocks.push(trace);
    x = trace.output;
  }

  const finalNorm = layerNorm(x);

  // 权重共享 unembedding：last 行 · embeddingᵀ。
  const last = finalNorm[seq - 1];
  const logits = w.embedding.map((row) => row.reduce((s, e, j) => s + e * last[j], 0));

  // bigram 偏置：让例句末词的下一个词通顺。
  const lastWord = sentence.words[seq - 1];
  const target = BIGRAM[lastWord];
  if (target != null && VOCAB_INDEX[target] != null) {
    logits[VOCAB_INDEX[target]] += BIGRAM_BONUS;
  }

  const probs = softmax(logits, temperature);
  const topk = probs
    .map((prob, token) => ({ token, word: VOCAB[token], prob, logit: logits[token] }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, TOP_K);

  return {
    tokens,
    tokenStrs: sentence.words,
    embeddings,
    posEncoding,
    posEncoded,
    blocks,
    finalNorm,
    logits,
    topk,
  };
}
