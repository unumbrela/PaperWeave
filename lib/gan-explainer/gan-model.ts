import * as tf from "@tensorflow/tfjs";
import type { GAN, GANNode, GANLink, NodeType, Scalar2D, Scalar3D, TrainingStats } from "./types";

class Node implements GANNode {
  layerName: string;
  index: number;
  type: NodeType;
  output: number | Scalar2D;
  inputLinks: GANLink[] = [];
  outputLinks: GANLink[] = [];
  featureMap?: Scalar3D;
  lossValue?: number;
  iteration?: number;

  constructor(layerName: string, index: number, type: NodeType, output: number | Scalar2D) {
    this.layerName = layerName;
    this.index = index;
    this.type = type;
    this.output = output;
  }
}

class Link implements GANLink {
  source: GANNode;
  dest: GANNode;
  weight: GANLink["weight"];
  isGradient?: boolean;
  direction?: "forward" | "backward";

  constructor(source: GANNode, dest: GANNode, weight: GANLink["weight"], isGradient?: boolean, direction?: "forward" | "backward") {
    this.source = source;
    this.dest = dest;
    this.weight = weight;
    this.isGradient = isGradient;
    this.direction = direction;
  }
}

function generateRandomOutput(rows: number, cols: number): Scalar2D {
  const output: Scalar2D = [];
  for (let i = 0; i < rows; i++) {
    const row: number[] = [];
    for (let j = 0; j < cols; j++) {
      row.push((Math.random() - 0.5) * 2);
    }
    output.push(row);
  }
  return output;
}

function generateRandomFeatureMap(channels: number, height: number, width: number): Scalar3D {
  const map: Scalar3D = [];
  for (let c = 0; c < channels; c++) {
    const channel: Scalar2D = [];
    for (let h = 0; h < height; h++) {
      const row: number[] = [];
      for (let w = 0; w < width; w++) {
        row.push((Math.random() - 0.5) * 2);
      }
      channel.push(row);
    }
    map.push(channel);
  }
  return map;
}

export function constructGAN(latentVector: number[] = []): GAN {
  const gan: GANNode[][] = [];
  const noiseDim = latentVector.length || 10;
  const channels = 3;

  const noiseLayer: GANNode[] = [];
  for (let i = 0; i < noiseDim; i++) {
    const value = latentVector[i] || (Math.random() * 2 - 1);
    noiseLayer.push(new Node("noise", i, "noise", value));
  }
  gan.push(noiseLayer);

  const genLayer1: GANNode[] = [];
  const gen1Size = 8;
  for (let i = 0; i < gen1Size; i++) {
    const output = generateRandomOutput(4, 4);
    const node = new Node("gen_1", i, "generator-layer", output);
    node.featureMap = generateRandomFeatureMap(16, 4, 4);
    for (let j = 0; j < noiseLayer.length; j++) {
      const link = new Link(noiseLayer[j], node, Math.random() * 2 - 1);
      noiseLayer[j].outputLinks.push(link);
      node.inputLinks.push(link);
    }
    genLayer1.push(node);
  }
  gan.push(genLayer1);

  const genLayer2: GANNode[] = [];
  const gen2Size = 8;
  for (let i = 0; i < gen2Size; i++) {
    const output = generateRandomOutput(8, 8);
    const node = new Node("gen_2", i, "generator-layer", output);
    node.featureMap = generateRandomFeatureMap(32, 8, 8);
    for (let j = 0; j < genLayer1.length; j++) {
      const link = new Link(genLayer1[j], node, Math.random() * 2 - 1);
      genLayer1[j].outputLinks.push(link);
      node.inputLinks.push(link);
    }
    genLayer2.push(node);
  }
  gan.push(genLayer2);

  const genLayer3: GANNode[] = [];
  const gen3Size = 8;
  for (let i = 0; i < gen3Size; i++) {
    const output = generateRandomOutput(16, 16);
    const node = new Node("gen_3", i, "generator-layer", output);
    node.featureMap = generateRandomFeatureMap(64, 16, 16);
    for (let j = 0; j < genLayer2.length; j++) {
      const link = new Link(genLayer2[j], node, Math.random() * 2 - 1);
      genLayer2[j].outputLinks.push(link);
      node.inputLinks.push(link);
    }
    genLayer3.push(node);
  }
  gan.push(genLayer3);

  const generatedLayer: GANNode[] = [];
  const generatedOutput = generateRandomOutput(64, 64);
  const generatedNode = new Node("generated", 0, "generated-image", generatedOutput);
  generatedNode.featureMap = generateRandomFeatureMap(channels, 64, 64);
  for (let j = 0; j < genLayer3.length; j++) {
    const link = new Link(genLayer3[j], generatedNode, Math.random() * 2 - 1);
    genLayer3[j].outputLinks.push(link);
    generatedNode.inputLinks.push(link);
  }
  generatedLayer.push(generatedNode);
  gan.push(generatedLayer);

  const realLayer: GANNode[] = [];
  const realOutput = generateRandomOutput(64, 64);
  const realNode = new Node("real", 0, "real-image", realOutput);
  realNode.featureMap = generateRandomFeatureMap(channels, 64, 64);
  realLayer.push(realNode);
  gan.push(realLayer);

  const discLayer1: GANNode[] = [];
  const disc1Size = 8;
  for (let i = 0; i < disc1Size; i++) {
    const output = generateRandomOutput(32, 32);
    const node = new Node("disc_1", i, "discriminator-layer", output);
    node.featureMap = generateRandomFeatureMap(64, 32, 32);
    const genLink = new Link(generatedNode, node, Math.random() * 2 - 1);
    generatedNode.outputLinks.push(genLink);
    node.inputLinks.push(genLink);
    const realLink = new Link(realNode, node, Math.random() * 2 - 1);
    realNode.outputLinks.push(realLink);
    node.inputLinks.push(realLink);
    discLayer1.push(node);
  }
  gan.push(discLayer1);

  const discLayer2: GANNode[] = [];
  const disc2Size = 8;
  for (let i = 0; i < disc2Size; i++) {
    const output = generateRandomOutput(16, 16);
    const node = new Node("disc_2", i, "discriminator-layer", output);
    node.featureMap = generateRandomFeatureMap(128, 16, 16);
    for (let j = 0; j < discLayer1.length; j++) {
      const link = new Link(discLayer1[j], node, Math.random() * 2 - 1);
      discLayer1[j].outputLinks.push(link);
      node.inputLinks.push(link);
    }
    discLayer2.push(node);
  }
  gan.push(discLayer2);

  const discLayer3: GANNode[] = [];
  const disc3Size = 4;
  for (let i = 0; i < disc3Size; i++) {
    const output = generateRandomOutput(8, 8);
    const node = new Node("disc_3", i, "discriminator-layer", output);
    node.featureMap = generateRandomFeatureMap(256, 8, 8);
    for (let j = 0; j < discLayer2.length; j++) {
      const link = new Link(discLayer2[j], node, Math.random() * 2 - 1);
      discLayer2[j].outputLinks.push(link);
      node.inputLinks.push(link);
    }
    discLayer3.push(node);
  }
  gan.push(discLayer3);

  const outputLayer: GANNode[] = [];
  // Use the generated image as the output visualization so the overview
  // renders an image instead of a single-color square.
  const outputNode = new Node("output", 0, "output", generatedOutput as Scalar2D);
  outputNode.lossValue = Math.random() * 2 - 1;
  for (let j = 0; j < discLayer3.length; j++) {
    const link = new Link(discLayer3[j], outputNode, Math.random());
    discLayer3[j].outputLinks.push(link);
    outputNode.inputLinks.push(link);
  }
  outputLayer.push(outputNode);
  gan.push(outputLayer);

  return gan;
}

export function generateTrainingStats(iterations: number = 50): TrainingStats {
  const generatorLoss: number[] = [];
  const discriminatorLoss: number[] = [];
  
  let genLoss = 2.5;
  let discLoss = 0.3;
  
  for (let i = 0; i < iterations; i++) {
    genLoss = Math.max(0.5, genLoss - Math.random() * 0.08 + 0.02);
    discLoss = Math.min(2.5, discLoss + Math.random() * 0.06 - 0.01);
    
    if (Math.random() < 0.1) {
      genLoss += Math.random() * 0.3;
      discLoss -= Math.random() * 0.2;
    }
    
    generatorLoss.push(genLoss);
    discriminatorLoss.push(discLoss);
  }
  
  return {
    generatorLoss,
    discriminatorLoss,
    iteration: iterations,
  };
}

export async function loadGANModel(modelFile: string): Promise<tf.LayersModel> {
  return tf.loadLayersModel(modelFile);
}