import type { PresetId, Vec2 } from "./types";
import { DOMAIN_MAX, DOMAIN_MIN } from "./config";
import { gaussian, type Rng } from "./rng";

const clamp = (v: number) => Math.min(DOMAIN_MAX, Math.max(DOMAIN_MIN, v));
const clampPt = (p: Vec2): Vec2 => [clamp(p[0]), clamp(p[1])];

const TAU = Math.PI * 2;

/** 反向采样的先验：各向同性标准正态 N(0, I)。 */
export function samplePrior(n: number, rng: Rng = Math.random): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i < n; i++) out.push([gaussian(rng), gaussian(rng)]);
  return out;
}

/**
 * 预设目标分布（数据坐标，约居中于原点、尺度 ~1.5，便于与 N(0,I) 先验对照）。
 */
export function samplePreset(id: PresetId, n: number, rng: Rng = Math.random): Vec2[] {
  if (id === "draw") return [];
  const out: Vec2[] = [];
  const noise = (s: number) => gaussian(rng) * s;

  switch (id) {
    case "two-gaussians": {
      for (let i = 0; i < n; i++) {
        const left = i % 2 === 0;
        const cx = left ? -1.2 : 1.2;
        const cy = left ? -0.4 : 0.4;
        out.push(clampPt([cx + noise(0.28), cy + noise(0.28)]));
      }
      break;
    }
    case "two-moons": {
      for (let i = 0; i < n; i++) {
        const theta = Math.PI * rng();
        let x: number;
        let y: number;
        if (i % 2 === 0) {
          x = Math.cos(theta);
          y = Math.sin(theta);
        } else {
          x = 1 - Math.cos(theta);
          y = 0.5 - Math.sin(theta);
        }
        // 居中 (0.5, 0.25) 并放大
        out.push(clampPt([(x - 0.5) * 1.6 + noise(0.06), (y - 0.25) * 1.6 + noise(0.06)]));
      }
      break;
    }
    case "ring": {
      for (let i = 0; i < n; i++) {
        const a = TAU * rng();
        const r = 1.5 + noise(0.06);
        out.push(clampPt([r * Math.cos(a), r * Math.sin(a)]));
      }
      break;
    }
    case "spiral": {
      for (let i = 0; i < n; i++) {
        const arm = i % 2 === 0 ? 0 : Math.PI;
        const u = rng();
        const r = 0.15 + u * 1.6;
        const a = u * 3 * Math.PI + arm;
        out.push(clampPt([r * Math.cos(a) + noise(0.05), r * Math.sin(a) + noise(0.05)]));
      }
      break;
    }
    case "s-curve": {
      for (let i = 0; i < n; i++) {
        const theta = (rng() * 2 - 1) * Math.PI; // [-π, π]
        out.push(clampPt([Math.sin(theta) * 1.1 + noise(0.07), theta * 0.5 + noise(0.07)]));
      }
      break;
    }
    case "smiley": {
      for (let i = 0; i < n; i++) {
        const r = rng();
        if (r < 0.5) {
          // 脸轮廓
          const a = TAU * rng();
          out.push(clampPt([1.7 * Math.cos(a) + noise(0.05), 1.7 * Math.sin(a) + noise(0.05)]));
        } else if (r < 0.62) {
          // 左眼
          out.push(clampPt([-0.6 + noise(0.12), 0.6 + noise(0.12)]));
        } else if (r < 0.74) {
          // 右眼
          out.push(clampPt([0.6 + noise(0.12), 0.6 + noise(0.12)]));
        } else {
          // 嘴（下弧）
          const a = Math.PI * (1.15 + rng() * 0.7);
          out.push(clampPt([0.95 * Math.cos(a) + noise(0.05), -0.2 + 0.95 * Math.sin(a) + noise(0.05)]));
        }
      }
      break;
    }
  }
  return out;
}
