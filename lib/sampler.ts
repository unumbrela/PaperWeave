import type * as tfType from '@tensorflow/tfjs'
import { TARGET_DATA, TARGET_SIZE } from './ganlab/targets-data'

type TF = typeof tfType
type Tensor2D = tfType.Tensor2D

// 彩色图像尺寸：48×48 RGB（小尺寸 + 小模型，保证浏览器内可靠收敛）
export const IMG_SIZE = TARGET_SIZE // 48
export const CHANNELS = 3
export const IMG_DIM = IMG_SIZE * IMG_SIZE * CHANNELS // 6912
export const LATENT_DIM = 16

export interface TargetImage {
  name: string
  category: string
  pixels: Float32Array // 长度 IMG_DIM，行优先 RGB，归一化 [0,1]
}

// base64 → 字节（浏览器用 atob，Node 用 Buffer）
function b64ToBytes(b64: string): Uint8Array {
  if (typeof atob === 'function') {
    const bin = atob(b64)
    const a = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i)
    return a
  }
  return new Uint8Array(Buffer.from(b64, 'base64'))
}

export const TARGET_IMAGES: TargetImage[] = TARGET_DATA.map((t) => {
  const bytes = b64ToBytes(t.b64)
  const pixels = new Float32Array(IMG_DIM)
  for (let i = 0; i < IMG_DIM; i++) pixels[i] = bytes[i] / 255
  return { name: t.name, category: t.category, pixels }
})

/** 选定目标图的张量 [1, IMG_DIM]（不缓存，由调用方负责 keep/dispose）。 */
export function targetTensor(targetIndex: number, tf: TF): Tensor2D {
  return tf.tensor2d(Array.from(TARGET_IMAGES[targetIndex].pixels), [1, IMG_DIM])
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
