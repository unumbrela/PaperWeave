import type * as tfType from '@tensorflow/tfjs'

type TF = typeof tfType
type Tensor2D = tfType.Tensor2D

// 图像与隐空间尺寸（小尺寸 + 小模型，保证浏览器内可靠快速收敛）
export const IMG_SIZE = 24
export const IMG_DIM = IMG_SIZE * IMG_SIZE // 576
export const LATENT_DIM = 16

export interface TargetImage {
  name: string
  pixels: Float32Array // 长度 IMG_DIM，行优先，灰度 [0,1]
}

// ---- 程序化绘制一小组「人脸 / 物体」目标图（白色形状，黑色背景）----

const N = IMG_SIZE
const C = (N - 1) / 2 // 中心
const blank = () => new Float32Array(IMG_DIM)
const inb = (x: number, y: number) => x >= 0 && x < N && y >= 0 && y < N
const set = (a: Float32Array, x: number, y: number, v: number) => {
  if (inb(x, y)) a[y * N + x] = v
}
const diskFill = (a: Float32Array, cx: number, cy: number, r: number, v: number) => {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
      if (Math.hypot(x - cx, y - cy) <= r) set(a, x, y, v)
}
const rectFill = (a: Float32Array, x0: number, y0: number, x1: number, y1: number, v: number) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(a, x, y, v)
}
const sign = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
  (ax - cx) * (by - cy) - (bx - cx) * (ay - cy)
const triFill = (
  a: Float32Array,
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  v: number,
) => {
  const xs = [p1[0], p2[0], p3[0]]
  const ys = [p1[1], p2[1], p3[1]]
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
    for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      const d1 = sign(x, y, p1[0], p1[1], p2[0], p2[1])
      const d2 = sign(x, y, p2[0], p2[1], p3[0], p3[1])
      const d3 = sign(x, y, p3[0], p3[1], p1[0], p1[1])
      const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
      const hasPos = d1 > 0 || d2 > 0 || d3 > 0
      if (!(hasNeg && hasPos)) set(a, x, y, v)
    }
}

function smiley(): Float32Array {
  const a = blank()
  diskFill(a, C, C, 10, 1)
  diskFill(a, C - 4, C - 3, 1.6, 0) // 眼
  diskFill(a, C + 4, C - 3, 1.6, 0)
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - C, y - (C - 2))
      if (d >= 6 && d <= 7.6 && y > C + 1) set(a, x, y, 0) // 微笑
    }
  return a
}

function cat(): Float32Array {
  const a = blank()
  triFill(a, [C - 8, C - 1], [C - 3, C - 10], [C - 1, C - 1], 1) // 左耳
  triFill(a, [C + 1, C - 1], [C + 3, C - 10], [C + 8, C - 1], 1) // 右耳
  diskFill(a, C, C + 1, 8.5, 1) // 头
  diskFill(a, C - 3, C, 1.2, 0) // 眼
  diskFill(a, C + 3, C, 1.2, 0)
  diskFill(a, C, C + 3, 1, 0) // 鼻
  return a
}

function house(): Float32Array {
  const a = blank()
  rectFill(a, C - 8, C - 1, C + 8, C + 9, 1) // 墙体
  triFill(a, [C - 10, C - 1], [C + 10, C - 1], [C, C - 10], 1) // 屋顶
  rectFill(a, C - 2, C + 3, C + 2, C + 9, 0) // 门
  return a
}

function tree(): Float32Array {
  const a = blank()
  rectFill(a, C - 2, C + 5, C + 2, C + 10, 1) // 树干
  triFill(a, [C - 9, C + 6], [C + 9, C + 6], [C, C - 10], 1) // 树冠
  return a
}

function star(): Float32Array {
  const a = blank()
  const R = 11
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const dx = Math.abs(x - C)
      const dy = Math.abs(y - C)
      const vert = dy <= R && dx <= 3.2 * Math.max(0, 1 - dy / R)
      const horiz = dx <= R && dy <= 3.2 * Math.max(0, 1 - dx / R)
      if (vert || horiz) set(a, x, y, 1)
    }
  return a
}

function heart(): Float32Array {
  const a = blank()
  diskFill(a, C - 4, C - 4, 5, 1) // 左瓣
  diskFill(a, C + 4, C - 4, 5, 1) // 右瓣
  triFill(a, [C - 8.5, C - 3], [C + 8.5, C - 3], [C, C + 10], 1) // 下尖
  return a
}

export const TARGET_IMAGES: TargetImage[] = [
  { name: '笑脸', pixels: smiley() },
  { name: '猫咪', pixels: cat() },
  { name: '房子', pixels: house() },
  { name: '树', pixels: tree() },
  { name: '星星', pixels: star() },
  { name: '爱心', pixels: heart() },
]

/** 选定目标图的张量 [1, IMG_DIM]（不缓存，由调用方负责 keep/dispose）。 */
export function targetTensor(targetIndex: number, tf: TF): Tensor2D {
  const t = TARGET_IMAGES[targetIndex].pixels
  return tf.tensor2d(Array.from(t), [1, IMG_DIM])
}

/** 真实样本批 [n, IMG_DIM]：复制选定的目标图并加轻微像素噪声做增强。 */
export function sampleReal(n: number, targetIndex: number, tf: TF): Tensor2D {
  const t = TARGET_IMAGES[targetIndex].pixels
  const flat = new Float32Array(n * IMG_DIM)
  for (let i = 0; i < n; i++) {
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
