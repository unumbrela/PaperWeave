import * as d3 from "d3";
import { DiffusionNode, DrawContext } from "./types";
import { NOISE_COLOR, DENOISE_COLOR, OUTPUT_COLOR } from "./config";

export function getNodeColor(type: string, noiseLevel?: number): string {
  if (type === "noise") {
    return NOISE_COLOR;
  } else if (type === "output") {
    return OUTPUT_COLOR;
  } else {
    const t = noiseLevel || 0;
    return d3.interpolateRgb(NOISE_COLOR, DENOISE_COLOR)(1 - t);
  }
}

export function getNodeOpacity(type: string, noiseLevel?: number): number {
  if (type === "noise") {
    return 0.9;
  } else if (type === "output") {
    return 1;
  } else {
    return 0.6 + (1 - (noiseLevel || 0)) * 0.4;
  }
}

export function drawNodeContent(
  ctx: DrawContext,
  node: DiffusionNode,
  x: number,
  y: number,
  size: number
): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext("2d");
  
  if (!c) return "";
  
  const noise = node.noiseLevel || 0;
  const quality = 1 - noise;
  
  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, size, size);
  
  const imageData = c.createImageData(size, size);
  const pixels = imageData.data;
  
  for (let i = 0; i < pixels.length; i += 4) {
    const r = Math.random();
    const g = Math.random();
    const b = Math.random();
    
    const noiseFactor = noise;
    const contentFactor = quality;
    
    if (noise > 0) {
      pixels[i] = Math.floor((r * noiseFactor + 128 * contentFactor) * 255);
      pixels[i + 1] = Math.floor((g * noiseFactor + 128 * contentFactor) * 255);
      pixels[i + 2] = Math.floor((b * noiseFactor + 128 * contentFactor) * 255);
    } else {
      const centerX = (i / 4) % size;
      const centerY = Math.floor((i / 4) / size);
      
      const dx = centerX - size / 2;
      const dy = centerY - size / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < size * 0.35) {
        pixels[i] = 255;
        pixels[i + 1] = 200;
        pixels[i + 2] = 150;
      } else if (dist < size * 0.4) {
        pixels[i] = 200;
        pixels[i + 1] = 150;
        pixels[i + 2] = 100;
      } else {
        pixels[i] = 240;
        pixels[i + 1] = 240;
        pixels[i + 2] = 240;
      }
    }
    pixels[i + 3] = 255;
  }
  
  c.putImageData(imageData, 0, 0);
  
  if (noise > 0 && noise < 1) {
    for (let i = 0; i < size * size * noise * 0.3; i++) {
      const nx = Math.random() * size;
      const ny = Math.random() * size;
      const bright = Math.random() * 0.8 + 0.2;
      c.fillStyle = `rgba(255, 255, 255, ${bright * noise})`;
      c.fillRect(nx, ny, 1, 1);
    }
  }
  
  return canvas.toDataURL();
}

export function getLinkColor(weight?: number): string {
  const opacity = weight ? Math.min(0.3 + weight * 0.5, 0.8) : 0.3;
  return `rgba(139, 92, 246, ${opacity})`;
}

export function computeLayerRanges(
  layers: DiffusionNode[][],
  rangeType: "local" | "module" | "global"
): Map<string, [number, number]> {
  const ranges = new Map<string, [number, number]>();
  
  if (rangeType === "global") {
    let min = Infinity;
    let max = -Infinity;
    layers.flat().forEach((node) => {
      const output = Array.isArray(node.output) ? node.output.flat() : [node.output];
      output.forEach((v) => {
        if (typeof v === "number") {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      });
    });
    layers.forEach((layer, li) => {
      layer.forEach((_, ni) => {
        ranges.set(`node-${li}-${ni}`, [min, max]);
      });
    });
  } else {
    layers.forEach((layer, li) => {
      let min = Infinity;
      let max = -Infinity;
      layer.forEach((node) => {
        const output = Array.isArray(node.output) ? node.output.flat() : [node.output];
        output.forEach((v) => {
          if (typeof v === "number") {
            if (v < min) min = v;
            if (v > max) max = v;
          }
        });
      });
      layer.forEach((_, ni) => {
        ranges.set(`node-${li}-${ni}`, [min, max]);
      });
    });
  }
  
  return ranges;
}