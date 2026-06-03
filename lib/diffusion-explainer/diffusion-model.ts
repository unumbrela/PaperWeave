import { Diffusion, DiffusionNode, DiffusionLink } from "./types";
import { TIMESTEPS_DISPLAY } from "./config";

function generateNodeId(layerIndex: number, nodeIndex: number): string {
  return `node-${layerIndex}-${nodeIndex}`;
}

export function constructDiffusion(): Diffusion {
  const layers: DiffusionNode[][] = [];
  const links: DiffusionLink[] = [];
  
  const timesteps = [100, 90, 50, 10, 1, 0];
  const nodeCounts = [1, 1, 1, 1, 1, 1];
  
  for (let layerIndex = 0; layerIndex < 6; layerIndex++) {
    const layer: DiffusionNode[] = [];
    const count = nodeCounts[layerIndex];
    
    for (let nodeIndex = 0; nodeIndex < count; nodeIndex++) {
      const timestep = timesteps[layerIndex];
      const noiseLevel = timestep / 100;
      
      const node: DiffusionNode = {
        id: generateNodeId(layerIndex, nodeIndex),
        layerName: layerIndex === 0 ? "noise" : layerIndex === 5 ? "output" : `denoise_${layerIndex - 1}`,
        type: layerIndex === 0 ? "noise" : layerIndex === 5 ? "output" : "denoise",
        timestep: timestep,
        noiseLevel: noiseLevel,
        output: noiseLevel,
        inputLinks: [],
        outputLinks: [],
        width: 64,
        height: 64,
      };
      
      layer.push(node);
    }
    
    layers.push(layer);
  }
  
  for (let layerIndex = 0; layerIndex < 5; layerIndex++) {
    const sourceNode = layers[layerIndex][0];
    const destNode = layers[layerIndex + 1][0];
    
    const link: DiffusionLink = {
      source: sourceNode.id,
      dest: destNode.id,
      weight: 1,
    };
    links.push(link);
    sourceNode.outputLinks.push(destNode.id);
    destNode.inputLinks.push(sourceNode.id);
  }
  
  return { layers, links };
}

export function getNoiseLevel(timestep: number, totalTimesteps: number = 100): number {
  return timestep / totalTimesteps;
}