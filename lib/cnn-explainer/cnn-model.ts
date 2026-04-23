import * as tf from "@tensorflow/tfjs";
import { getInputImageArray } from "./image-utils";
import type { CNN, CNNLink, CNNNode, NodeType, Scalar2D } from "./types";

class Node implements CNNNode {
  layerName: string;
  index: number;
  type: NodeType;
  bias: number;
  output: number | Scalar2D;
  logit?: number;
  realIndex?: number;
  inputLinks: CNNLink[] = [];
  outputLinks: CNNLink[] = [];

  constructor(
    layerName: string,
    index: number,
    type: NodeType,
    bias: number,
    output: number | Scalar2D,
  ) {
    this.layerName = layerName;
    this.index = index;
    this.type = type;
    this.bias = bias;
    this.output = output;
  }
}

class Link implements CNNLink {
  source: CNNNode;
  dest: CNNNode;
  weight: CNNLink["weight"];
  constructor(source: CNNNode, dest: CNNNode, weight: CNNLink["weight"]) {
    this.source = source;
    this.dest = dest;
    this.weight = weight;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyLayer = any;

function inferLayerType(name: string): NodeType {
  if (name.includes("conv")) return "conv";
  if (name.includes("pool")) return "pool";
  if (name.includes("relu")) return "relu";
  if (name.includes("flatten")) return "flatten";
  if (name.includes("output")) return "fc";
  return "fc";
}

function constructCNNFromOutputs(
  allOutputs: tf.Tensor[],
  model: tf.LayersModel,
  inputImageTensor: tf.Tensor3D,
): CNN {
  const cnn: CNNNode[][] = [];

  const inputLayer: CNNNode[] = [];
  const inputShape = (
    model.layers[0] as AnyLayer
  ).batchInputShape.slice(1) as number[];
  const inputImageArray = inputImageTensor.transpose([2, 0, 1]).arraySync() as number[][][];

  for (let i = 0; i < inputShape[2]; i++) {
    inputLayer.push(new Node("input", i, "input", 0, inputImageArray[i]));
  }
  cnn.push(inputLayer);

  let curLayerIndex = 1;

  for (let l = 0; l < model.layers.length; l++) {
    const layer = model.layers[l] as AnyLayer;
    const squeezed = allOutputs[l].squeeze();
    const outputs = squeezed.arraySync() as number[] | number[][] | number[][][];
    const type = inferLayerType(layer.name);
    const curLayerNodes: CNNNode[] = [];

    if (type === "conv") {
      const biases = layer.bias.val.arraySync() as number[];
      const weights = (layer.kernel.val as tf.Tensor)
        .transpose([3, 2, 0, 1])
        .arraySync() as number[][][][];

      for (let i = 0; i < (outputs as number[][][]).length; i++) {
        const node = new Node(
          layer.name,
          i,
          "conv",
          biases[i],
          (outputs as number[][][])[i],
        );
        for (let j = 0; j < cnn[curLayerIndex - 1].length; j++) {
          const preNode = cnn[curLayerIndex - 1][j];
          const link = new Link(preNode, node, weights[i][j]);
          preNode.outputLinks.push(link);
          node.inputLinks.push(link);
        }
        curLayerNodes.push(node);
      }
    } else if (type === "fc") {
      const biases = layer.bias.val.arraySync() as number[];
      const weights = (layer.kernel.val as tf.Tensor)
        .transpose([1, 0])
        .arraySync() as number[][];

      for (let i = 0; i < (outputs as number[]).length; i++) {
        const node = new Node(
          layer.name,
          i,
          "fc",
          biases[i],
          (outputs as number[])[i],
        );
        let logit = 0;
        for (let j = 0; j < cnn[curLayerIndex - 1].length; j++) {
          const preNode = cnn[curLayerIndex - 1][j];
          const link = new Link(preNode, node, weights[i][j]);
          preNode.outputLinks.push(link);
          node.inputLinks.push(link);
          logit += (preNode.output as number) * weights[i][j];
        }
        logit += biases[i];
        node.logit = logit;
        curLayerNodes.push(node);
      }
      cnn[curLayerIndex - 1].sort((a, b) => (a.realIndex ?? 0) - (b.realIndex ?? 0));
    } else if (type === "relu" || type === "pool") {
      for (let i = 0; i < (outputs as number[][][]).length; i++) {
        const node = new Node(
          layer.name,
          i,
          type,
          0,
          (outputs as number[][][])[i],
        );
        const preNode = cnn[curLayerIndex - 1][i];
        const link = new Link(preNode, node, null);
        preNode.outputLinks.push(link);
        node.inputLinks.push(link);
        curLayerNodes.push(node);
      }
    } else if (type === "flatten") {
      for (let i = 0; i < (outputs as number[]).length; i++) {
        const preNodeWidth = (cnn[curLayerIndex - 1][0].output as Scalar2D).length;
        const preNodeNum = cnn[curLayerIndex - 1].length;
        const preNodeIndex = i % preNodeNum;
        const preNodeRow = Math.floor(Math.floor(i / preNodeNum) / preNodeWidth);
        const preNodeCol = Math.floor(i / preNodeNum) % preNodeWidth;
        const realIndex =
          preNodeIndex * (preNodeWidth * preNodeWidth) +
          preNodeRow * preNodeWidth +
          preNodeCol;

        const node = new Node(
          layer.name,
          i,
          "flatten",
          0,
          (outputs as number[])[i],
        );
        node.realIndex = realIndex;

        const link = new Link(
          cnn[curLayerIndex - 1][preNodeIndex],
          node,
          [preNodeRow, preNodeCol],
        );
        cnn[curLayerIndex - 1][preNodeIndex].outputLinks.push(link);
        node.inputLinks.push(link);
        curLayerNodes.push(node);
      }
      curLayerNodes.sort((a, b) => a.index - b.index);
    }

    cnn.push(curLayerNodes);
    curLayerIndex++;

    squeezed.dispose();
  }

  return cnn as CNN;
}

export async function loadTrainedModel(modelFile: string): Promise<tf.LayersModel> {
  return tf.loadLayersModel(modelFile);
}

export async function constructCNN(
  inputImageFile: string,
  model: tf.LayersModel,
): Promise<CNN> {
  const inputImageTensor = await getInputImageArray(inputImageFile, true);
  const inputImageTensorBatch = tf.stack([inputImageTensor]);

  let preTensor: tf.Tensor = inputImageTensorBatch;
  const outputs: tf.Tensor[] = [];

  for (let l = 0; l < model.layers.length; l++) {
    const curTensor = model.layers[l].apply(preTensor) as tf.Tensor;

    let output = curTensor.squeeze();
    if (output.shape.length === 3) {
      output = output.transpose([2, 0, 1]);
    }
    outputs.push(output);
    preTensor = curTensor;
  }

  const cnn = constructCNNFromOutputs(outputs, model, inputImageTensor);

  // Clean up tensors
  inputImageTensor.dispose();
  inputImageTensorBatch.dispose();
  outputs.forEach((t) => t.dispose());

  // Ignore the flatten layer but keep it as a side-channel for softmax
  const flatten = cnn[cnn.length - 2];
  cnn.splice(cnn.length - 2, 1);
  cnn.flatten = flatten;
  return cnn;
}

export async function constructCNNFromTensor(
  inputImageTensor: tf.Tensor3D,
  model: tf.LayersModel,
): Promise<CNN> {
  const inputImageTensorBatch = tf.stack([inputImageTensor]);
  let preTensor: tf.Tensor = inputImageTensorBatch;
  const outputs: tf.Tensor[] = [];

  for (let l = 0; l < model.layers.length; l++) {
    const curTensor = model.layers[l].apply(preTensor) as tf.Tensor;
    let output = curTensor.squeeze();
    if (output.shape.length === 3) {
      output = output.transpose([2, 0, 1]);
    }
    outputs.push(output);
    preTensor = curTensor;
  }

  const cnn = constructCNNFromOutputs(outputs, model, inputImageTensor);

  inputImageTensorBatch.dispose();
  outputs.forEach((t) => t.dispose());

  const flatten = cnn[cnn.length - 2];
  cnn.splice(cnn.length - 2, 1);
  cnn.flatten = flatten;
  return cnn;
}
