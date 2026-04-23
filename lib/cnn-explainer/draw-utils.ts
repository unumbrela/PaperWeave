import { overviewConfig } from "./config";
import type { CNN, Scalar2D } from "./types";

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
  targetLayerIndex: number;
  targetNodeIndex: number;
  sourceNodeIndex: number;
}

export function getLinkData(
  nodeCoordinate: { x: number; y: number }[][],
  cnn: CNN,
): LinkDatum[] {
  const linkData: LinkDatum[] = [];
  for (let l = 1; l < cnn.length; l++) {
    for (let n = 0; n < cnn[l].length; n++) {
      const isOutput = cnn[l][n].layerName === "output";
      const curTarget = getInputKnot(nodeCoordinate[l][n]);
      for (let p = 0; p < cnn[l][n].inputLinks.length; p++) {
        let inputNodeIndex = cnn[l][n].inputLinks[p].source.index;

        if (isOutput) {
          const prev = cnn[l - 1][0].output as Scalar2D;
          const flattenDimension = prev.length * prev.length;
          if (inputNodeIndex % flattenDimension !== 0) continue;
          inputNodeIndex = Math.floor(inputNodeIndex / flattenDimension);
        }

        const curSource = getOutputKnot(nodeCoordinate[l - 1][inputNodeIndex]);
        linkData.push({
          source: curSource,
          target: curTarget,
          weight: cnn[l][n].inputLinks[p].weight,
          targetLayerIndex: l,
          targetNodeIndex: n,
          sourceNodeIndex: inputNodeIndex,
        });
      }
    }
  }
  return linkData;
}

/**
 * Color scale wrapper supporting an artificially lighter color via a `gap`
 * that shrinks the color ramp endpoints.
 */
export function gappedColorScale(
  colorScale: (t: number) => string,
  range: number,
  value: number,
  gap = 0,
): string {
  const normalized = (value + range / 2) / range;
  return colorScale(normalized * (1 - 2 * gap) + gap);
}
