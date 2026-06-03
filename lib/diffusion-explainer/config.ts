export const NOISE_COLOR = "#667eea";
export const DENOISE_COLOR = "#22c55e";
export const OUTPUT_COLOR = "#f4c25a";
export const TIMESTEP_COLOR = "#8b5cf6";

export const NODE_LENGTH = 60;
export const GAP_RATIO = 2;
export const DEFAULT_WIDTH = 800;
export const DEFAULT_HEIGHT = 500;

export const COLOR_SCALES = {
  noise: "interpolateViridis",
  denoise: "interpolateRdYlGn",
  output: "interpolateOranges",
};

export const LAYER_LABELS = {
  noise: "t=100",
  denoise_0: "t=90",
  denoise_1: "t=50",
  denoise_2: "t=10",
  denoise_3: "t=1",
  output: "t=0",
};

export const DETAILED_LABELS = {
  noise: "Noise (100%)",
  denoise_0: "Step 90 (10% noise)",
  denoise_1: "Step 50 (50% noise)",
  denoise_2: "Step 10 (90% noise)",
  denoise_3: "Step 1 (99% noise)",
  output: "Generated Image",
};

export const TOTAL_TIMESTEPS = 100;

export const TIMESTEPS_DISPLAY = [100, 90, 50, 10, 1];

export function getNoiseLevel(timestep: number): number {
  return timestep / TOTAL_TIMESTEPS;
}

export function getImageQuality(timestep: number): number {
  return 1 - (timestep / TOTAL_TIMESTEPS);
}