import type * as tfType from '@tensorflow/tfjs'

type TF = typeof tfType
type Tensor2D = tfType.Tensor2D

// 图像与隐空间尺寸（小尺寸 + 小模型，保证浏览器内可靠快速收敛）
export const IMG_SIZE = 16
export const IMG_DIM = IMG_SIZE * IMG_SIZE // 256
export const LATENT_DIM = 16

export interface TargetImage {
  name: string
  pixels: Float32Array // 长度 IMG_DIM，行优先，灰度 [0,1]
}

// ---- 程序化绘制一小组固定目标图（白色形状，黑色背景）----

function blank(): Float32Array {
  return new Float32Array(IMG_DIM)
}
const at = (a: Float32Array, x: number, y: number, v: number) => {
  if (x >= 0 && x < IMG_SIZE && y >= 0 && y < IMG_SIZE) a[y * IMG_SIZE + x] = v
}
const C = (IMG_SIZE - 1) / 2 // 中心

function disk(): Float32Array {
  const a = blank()
  for (let y = 0; y < IMG_SIZE; y++)
    for (let x = 0; x < IMG_SIZE; x++) {
      const d = Math.hypot(x - C, y - C)
      at(a, x, y, d <= 5 ? 1 : d <= 6 ? 6 - d : 0)
    }
  return a
}

function ring(): Float32Array {
  const a = blank()
  for (let y = 0; y < IMG_SIZE; y++)
    for (let x = 0; x < IMG_SIZE; x++) {
      const d = Math.hypot(x - C, y - C)
      at(a, x, y, d >= 3.5 && d <= 6 ? 1 - Math.min(1, Math.abs(d - 4.75) / 1.25) : 0)
    }
  return a
}

function cross(): Float32Array {
  const a = blank()
  for (let i = 0; i < IMG_SIZE; i++)
    for (let j = 0; j < IMG_SIZE; j++) {
      if (Math.abs(j - C) <= 1.5 || Math.abs(i - C) <= 1.5) at(a, j, i, 1)
    }
  return a
}

function square(): Float32Array {
  const a = blank()
  for (let y = 3; y <= IMG_SIZE - 4; y++)
    for (let x = 3; x <= IMG_SIZE - 4; x++) {
      const edge = x === 3 || x === IMG_SIZE - 4 || y === 3 || y === IMG_SIZE - 4
      at(a, x, y, edge ? 1 : 0.0)
    }
  // 填充方块（实心更易识别）
  for (let y = 3; y <= IMG_SIZE - 4; y++) for (let x = 3; x <= IMG_SIZE - 4; x++) at(a, x, y, 1)
  return a
}

function triangle(): Float32Array {
  const a = blank()
  for (let y = 2; y <= IMG_SIZE - 3; y++) {
    const half = ((y - 2) / (IMG_SIZE - 5)) * (C + 0.5)
    for (let x = 0; x < IMG_SIZE; x++) if (Math.abs(x - C) <= half) at(a, x, y, 1)
  }
  return a
}

function exShape(): Float32Array {
  const a = blank()
  for (let y = 0; y < IMG_SIZE; y++)
    for (let x = 0; x < IMG_SIZE; x++) {
      if (Math.abs(x - y) <= 1.5 || Math.abs(x + y - (IMG_SIZE - 1)) <= 1.5) at(a, x, y, 1)
    }
  return a
}

export const TARGET_IMAGES: TargetImage[] = [
  { name: '圆', pixels: disk() },
  { name: '环', pixels: ring() },
  { name: '十字', pixels: cross() },
  { name: '方块', pixels: square() },
  { name: '三角', pixels: triangle() },
  { name: 'X', pixels: exShape() },
]

let targetTensor: Tensor2D | null = null
/** 目标图堆叠成 [K, IMG_DIM]（缓存）。 */
export function targetsTensor(tf: TF): Tensor2D {
  if (!targetTensor || targetTensor.isDisposed) {
    const flat: number[] = []
    for (const t of TARGET_IMAGES) flat.push(...Array.from(t.pixels))
    // tf.keep：缓存张量不被外层 tf.tidy 释放
    targetTensor = tf.keep(tf.tensor2d(flat, [TARGET_IMAGES.length, IMG_DIM]))
  }
  return targetTensor
}

/** 真实样本批 [n, IMG_DIM]：随机取目标图并加轻微像素噪声做增强。 */
export function sampleReal(n: number, tf: TF): Tensor2D {
  const K = TARGET_IMAGES.length
  const flat = new Float32Array(n * IMG_DIM)
  for (let i = 0; i < n; i++) {
    const t = TARGET_IMAGES[Math.floor(Math.random() * K)].pixels
    const off = i * IMG_DIM
    for (let p = 0; p < IMG_DIM; p++) {
      flat[off + p] = Math.min(1, Math.max(0, t[p] + (Math.random() - 0.5) * 0.04))
    }
  }
  return tf.tensor2d(flat, [n, IMG_DIM])
}

/** 隐变量噪声 [n, LATENT_DIM]，标准正态。 */
export function sampleNoise(n: number, tf: TF): Tensor2D {
  return tf.randomNormal([n, LATENT_DIM]) as Tensor2D
}
