import * as tf from "@tensorflow/tfjs";
import type { Transformer, TransformerNode, TransformerLink, NodeType, Scalar2D, AttentionHead } from "./types";

class Node implements TransformerNode {
  layerName: string;
  index: number;
  headIndex?: number;
  type: NodeType;
  output: number | Scalar2D;
  inputLinks: TransformerLink[] = [];
  outputLinks: TransformerLink[] = [];
  attentionWeights?: Scalar2D;
  hasResidual: boolean = false;

  constructor(
    layerName: string,
    index: number,
    type: NodeType,
    output: number | Scalar2D,
    headIndex?: number,
  ) {
    this.layerName = layerName;
    this.index = index;
    this.type = type;
    this.output = output;
    this.headIndex = headIndex;
  }
}

class Link implements TransformerLink {
  source: TransformerNode;
  dest: TransformerNode;
  weight: TransformerLink["weight"];
  attentionScore?: number;
  isResidual: boolean = false;

  constructor(source: TransformerNode, dest: TransformerNode, weight: TransformerLink["weight"], attentionScore?: number, isResidual: boolean = false) {
    this.source = source;
    this.dest = dest;
    this.weight = weight;
    this.attentionScore = attentionScore;
    this.isResidual = isResidual;
  }
}

function inferLayerType(name: string): NodeType {
  if (name.includes("input")) return "input";
  if (name.includes("embedding")) return "embedding";
  if (name.includes("mha") || name.includes("attention")) return "multihead-attention";
  if (name.includes("norm")) return "layer-norm";
  if (name.includes("ffn") || name.includes("feed")) return "feed-forward";
  if (name.includes("output")) return "output";
  return "output";
}

function generateRandomAttentionWeights(seqLen: number): Scalar2D {
  const weights: Scalar2D = [];
  for (let i = 0; i < seqLen; i++) {
    const row: number[] = [];
    for (let j = 0; j < seqLen; j++) {
      row.push(Math.random());
    }
    const sum = row.reduce((a, b) => a + b, 0);
    weights.push(row.map(v => v / sum));
  }
  return weights;
}

function generateRandomOutput(seqLen: number, hiddenSize: number): Scalar2D {
  const output: Scalar2D = [];
  for (let i = 0; i < seqLen; i++) {
    const row: number[] = [];
    for (let j = 0; j < hiddenSize; j++) {
      row.push((Math.random() - 0.5) * 2);
    }
    output.push(row);
  }
  return output;
}

export function constructTransformer(inputText: string): Transformer {
  const transformer: TransformerNode[][] = [];
  const seqLen = 8;
  const hiddenSize = 64;

  const inputLayer: TransformerNode[] = [];
  for (let i = 0; i < seqLen; i++) {
    const tokenOutput: Scalar2D = [];
    for (let j = 0; j < hiddenSize; j++) {
      tokenOutput.push([(Math.random() - 0.5) * 2]);
    }
    inputLayer.push(new Node("input", i, "input", tokenOutput));
  }
  transformer.push(inputLayer);

  const embeddingLayer: TransformerNode[] = [];
  for (let i = 0; i < seqLen; i++) {
    const output = generateRandomOutput(1, hiddenSize).map(row => row.slice(0, 16));
    const node = new Node("embedding", i, "embedding", output);
    const link = new Link(inputLayer[i], node, null);
    inputLayer[i].outputLinks.push(link);
    node.inputLinks.push(link);
    embeddingLayer.push(node);
  }
  transformer.push(embeddingLayer);

  for (let encoderIdx = 0; encoderIdx < 2; encoderIdx++) {
    const mhaLayer: TransformerNode[] = [];
    for (let i = 0; i < seqLen; i++) {
      const attentionWeights = generateRandomAttentionWeights(seqLen);
      const output = generateRandomOutput(1, hiddenSize).map(row => row.slice(0, 16));
      const node = new Node(`encoder_${encoderIdx + 1}_mha`, i, "multihead-attention", output);
      node.attentionWeights = attentionWeights;
      for (let j = 0; j < seqLen; j++) {
        const link = new Link(transformer[transformer.length - 1][j], node, attentionWeights[j][i]);
        transformer[transformer.length - 1][j].outputLinks.push(link);
        node.inputLinks.push(link);
      }
      mhaLayer.push(node);
    }
    transformer.push(mhaLayer);

    const norm1Layer: TransformerNode[] = [];
    for (let i = 0; i < seqLen; i++) {
      const output = generateRandomOutput(1, hiddenSize).map(row => row.slice(0, 16));
      const node = new Node(`encoder_${encoderIdx + 1}_norm1`, i, "layer-norm", output);
      node.hasResidual = true;
      
      const mhaLink = new Link(mhaLayer[i], node, null);
      mhaLayer[i].outputLinks.push(mhaLink);
      node.inputLinks.push(mhaLink);
      
      const prevLayer = transformer[transformer.length - 2];
      const residualLink = new Link(prevLayer[i], node, null, undefined, true);
      prevLayer[i].outputLinks.push(residualLink);
      node.inputLinks.push(residualLink);
      
      norm1Layer.push(node);
    }
    transformer.push(norm1Layer);

    const ffnLayer: TransformerNode[] = [];
    for (let i = 0; i < seqLen; i++) {
      const output = generateRandomOutput(1, hiddenSize).map(row => row.slice(0, 16));
      const node = new Node(`encoder_${encoderIdx + 1}_ffn`, i, "feed-forward", output);
      const link = new Link(norm1Layer[i], node, null);
      norm1Layer[i].outputLinks.push(link);
      node.inputLinks.push(link);
      ffnLayer.push(node);
    }
    transformer.push(ffnLayer);

    const norm2Layer: TransformerNode[] = [];
    for (let i = 0; i < seqLen; i++) {
      const output = generateRandomOutput(1, hiddenSize).map(row => row.slice(0, 16));
      const node = new Node(`encoder_${encoderIdx + 1}_norm2`, i, "layer-norm", output);
      node.hasResidual = true;
      
      const ffnLink = new Link(ffnLayer[i], node, null);
      ffnLayer[i].outputLinks.push(ffnLink);
      node.inputLinks.push(ffnLink);
      
      const residualLink = new Link(norm1Layer[i], node, null, undefined, true);
      norm1Layer[i].outputLinks.push(residualLink);
      node.inputLinks.push(residualLink);
      
      norm2Layer.push(node);
    }
    transformer.push(norm2Layer);
  }

  const outputLayer: TransformerNode[] = [];
  for (let i = 0; i < seqLen; i++) {
    const output = generateRandomOutput(1, hiddenSize).map(row => row.slice(0, 16));
    const node = new Node("output", i, "output", output);
    const link = new Link(transformer[transformer.length - 1][i], node, null);
    transformer[transformer.length - 1][i].outputLinks.push(link);
    node.inputLinks.push(link);
    outputLayer.push(node);
  }
  transformer.push(outputLayer);

  return transformer;
}

export async function loadTransformerModel(modelFile: string): Promise<tf.LayersModel> {
  return tf.loadLayersModel(modelFile);
}

export function computeAttentionHeads(transformer: Transformer): AttentionHead[][] {
  const heads: AttentionHead[][] = [];
  
  for (const layer of transformer) {
    if (layer.length > 0 && layer[0].type === "multihead-attention") {
      const layerHeads: AttentionHead[] = [];
      for (let i = 0; i < Math.min(layer.length, 4); i++) {
        const node = layer[i];
        if (node.attentionWeights) {
          layerHeads.push({
            index: i,
            scores: node.attentionWeights,
            output: node.output as Scalar2D,
          });
        }
      }
      heads.push(layerHeads);
    }
  }
  
  return heads;
}