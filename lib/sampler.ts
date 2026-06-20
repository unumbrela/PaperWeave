import type * as tfType from '@tensorflow/tfjs'

type TF = typeof tfType
type Tensor2D = tfType.Tensor2D

export type Distribution = 'gaussians' | 'line' | 'ring' | 'disjoint' | 'drawing'

export const PRESET_DISTRIBUTIONS: { id: Distribution; label: string }[] = [
  { id: 'gaussians', label: '双高斯' },
  { id: 'line', label: '斜线' },
  { id: 'ring', label: '环形' },
  { id: 'disjoint', label: '分离三簇' },
]

export type DrawingPositions = Array<[number, number]>

// Box-Muller 标准正态采样
function randNormal(): number {
  const u = 1 - Math.random()
  const v = 1 - Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

/** 从真实分布采一个落在单位方格 [0,1]^2 的点（对齐 GAN Lab 预设）。 */
export function sampleTruePoint(
  dist: Distribution,
  drawing?: DrawingPositions,
): [number, number] {
  const r = Math.random()
  switch (dist) {
    case 'line':
      return [0.8 - 0.75 * r + 0.01 * randNormal(), 0.6 + 0.3 * r + 0.01 * randNormal()]
    case 'gaussians':
      return r < 0.5
        ? [0.3 + 0.1 * randNormal(), 0.7 + 0.1 * randNormal()]
        : [0.7 + 0.05 * randNormal(), 0.4 + 0.2 * randNormal()]
    case 'ring':
      return [
        0.5 + 0.3 * Math.cos(r * Math.PI * 2) + 0.025 * randNormal(),
        0.45 + 0.25 * Math.sin(r * Math.PI * 2) + 0.025 * randNormal(),
      ]
    case 'disjoint': {
      const s = 0.025
      if (r < 1 / 3) return [0.35 + s * randNormal(), 0.75 + s * randNormal()]
      if (r < 2 / 3) return [0.75 + s * randNormal(), 0.6 + s * randNormal()]
      return [0.45 + s * randNormal(), 0.35 + s * randNormal()]
    }
    case 'drawing': {
      if (!drawing || drawing.length === 0) return [0.5, 0.5]
      const p = drawing[Math.floor(drawing.length * r)]
      return [p[0] + 0.02 * randNormal(), p[1] + 0.02 * randNormal()]
    }
    default:
      return [0.5, 0.5]
  }
}

/** 真实样本张量 [n,2]。 */
export function sampleReal(
  n: number,
  dist: Distribution,
  tf: TF,
  drawing?: DrawingPositions,
): Tensor2D {
  const arr = new Array<number>(n * 2)
  for (let i = 0; i < n; ++i) {
    const [x, y] = sampleTruePoint(dist, drawing)
    arr[i * 2] = x
    arr[i * 2 + 1] = y
  }
  return tf.tensor2d(arr, [n, 2])
}

/** 均匀噪声输入 [n, noiseSize]，范围 [0,1]。 */
export function sampleNoise(n: number, tf: TF, noiseSize = 2): Tensor2D {
  return tf.randomUniform([n, noiseSize], 0, 1) as Tensor2D
}

/**
 * 生成器流形的输入网格：噪声空间 [0,1]^2 上的 (cells+1)^2 个顶点，
 * 行优先索引 idx = i*(cells+1)+j。喂给生成器后画成形变网格。
 */
export function manifoldNoiseGrid(cells: number, tf: TF): Tensor2D {
  const side = cells + 1
  const arr = new Array<number>(side * side * 2)
  let k = 0
  for (let i = 0; i < side; ++i) {
    for (let j = 0; j < side; ++j) {
      arr[k++] = i / cells
      arr[k++] = j / cells
    }
  }
  return tf.tensor2d(arr, [side * side, 2])
}

/** 判别器热力图的网格坐标 [res*res,2]，像素 (col,row) → (x=col/res, y=row/res)。 */
export function discriminatorGrid(res: number, tf: TF): Tensor2D {
  const arr = new Array<number>(res * res * 2)
  let k = 0
  for (let row = 0; row < res; ++row) {
    for (let col = 0; col < res; ++col) {
      arr[k++] = (col + 0.5) / res
      arr[k++] = (row + 0.5) / res
    }
  }
  return tf.tensor2d(arr, [res * res, 2])
}
