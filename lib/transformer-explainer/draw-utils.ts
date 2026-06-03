import { overviewConfig } from "./config";
import type { Transformer, Scalar2D } from "./types";

const nodeLength = overviewConfig.nodeLength;

export function getExtent(array: number | Scalar2D): [number, number] {
  if (typeof array === "number") return [array, array];
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < array.length; i++) {
    const row = array[i];
    if (typeof row === "number") {
      if (row < min) min = row;
      if (row > max) max = row;
    } else {
      for (let j = 0; j < row.length; j++) {
        if (row[j] < min) min = row[j];
        if (row[j] > max) max = row[j];
      }
    }
  }
  return [min, max];
}

export function getOutputKnot(point: { x: number; y: number }) {
  return { x: point.x + nodeLength, y: point.y + nodeLength / 2 };
}

export function getInputKnot(point: { x: number; y: number }) {
  return { x: point.x, y: point.y + nodeLength / 2 };
}

export interface LinkDatum {
  source: { x: number; y: number };
  target: { x: number; y: number };
  weight: unknown;
  attentionScore?: number;
  isResidual?: boolean;
  targetLayerIndex: number;
  targetNodeIndex: number;
  sourceNodeIndex: number;
  sourceLayerIndex: number;
}

export function getLinkData(
  nodeCoordinate: { x: number; y: number }[][],
  transformer: Transformer,
): LinkDatum[] {
  const linkData: LinkDatum[] = [];
  for (let l = 1; l < transformer.length; l++) {
    for (let n = 0; n < transformer[l].length; n++) {
      const curTarget = getInputKnot(nodeCoordinate[l][n]);
      for (let p = 0; p < transformer[l][n].inputLinks.length; p++) {
        const inputLink = transformer[l][n].inputLinks[p];
        const sourceNode = inputLink.source;
        let sourceLayerIndex = -1;
        for (let sl = 0; sl < transformer.length; sl++) {
          if (transformer[sl].find(n => n.layerName === sourceNode.layerName && n.index === sourceNode.index)) {
            sourceLayerIndex = sl;
            break;
          }
        }
        
        if (sourceLayerIndex >= 0) {
          const curSource = getOutputKnot(nodeCoordinate[sourceLayerIndex][sourceNode.index]);
          linkData.push({
            source: curSource,
            target: curTarget,
            weight: inputLink.weight,
            attentionScore: inputLink.attentionScore,
            isResidual: inputLink.isResidual,
            targetLayerIndex: l,
            targetNodeIndex: n,
            sourceNodeIndex: sourceNode.index,
            sourceLayerIndex,
          });
        }
      }
    }
  }
  return linkData;
}

export function gappedColorScale(
  colorScale: (t: number) => string,
  range: number,
  value: number,
  gap = 0,
): string {
  const normalized = (value + range / 2) / range;
  return colorScale(normalized * (1 - 2 * gap) + gap);
}