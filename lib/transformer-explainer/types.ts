// 玩具 Transformer 的前向追踪类型。所有矩阵都是 number[][]（行=token 位置）。
export type Matrix = number[][];
export type Vector = number[];

/** 单个注意力头的中间量。 */
export interface HeadTrace {
  q: Matrix; // seq × dHead
  k: Matrix; // seq × dHead
  v: Matrix; // seq × dHead
  /** 缩放点积 + 因果掩码 + softmax 后的注意力权重（行=查询，列=键）。 */
  scores: Matrix; // seq × seq
  out: Matrix; // seq × dHead，= scores @ v
}

/** 单个 Transformer Block 的中间量。 */
export interface BlockTrace {
  heads: HeadTrace[];
  mhaConcat: Matrix; // seq × dModel，多头拼接
  attnOut: Matrix; // seq × dModel，经输出投影 Wo
  afterAttnNorm: Matrix; // seq × dModel，残差 + LayerNorm 后
  ffnHidden: Matrix; // seq × dFF，FFN 第一层 + GELU
  ffnOut: Matrix; // seq × dModel，FFN 第二层
  output: Matrix; // seq × dModel，本 block 最终输出（残差 + LN 后）
}

export interface TopKItem {
  token: number;
  word: string;
  prob: number;
  logit: number;
}

/** 一次完整前向传播的全部可视化数据。 */
export interface ForwardTrace {
  tokens: number[];
  tokenStrs: string[];
  embeddings: Matrix; // seq × dModel，词嵌入
  posEncoding: Matrix; // seq × dModel，正弦位置编码
  posEncoded: Matrix; // seq × dModel，词嵌入 + 位置编码
  blocks: BlockTrace[];
  finalNorm: Matrix; // seq × dModel，末端 LayerNorm
  /** 最后一个位置在整个词表上的 logits。 */
  logits: number[];
  /** 取温度后的 Top-K 预测。 */
  topk: TopKItem[];
}
