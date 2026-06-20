import { describe, it, expect, beforeAll } from 'vitest'
import * as tf from '@tensorflow/tfjs'
import { GANLabModel } from '@/lib/ganModel'
import {
  Distribution,
  discriminatorGrid,
  manifoldNoiseGrid,
  sampleNoise,
  sampleReal,
  sampleTruePoint,
} from '@/lib/sampler'

beforeAll(async () => {
  await tf.setBackend('cpu')
  await tf.ready()
})

const DISTS: Distribution[] = ['gaussians', 'line', 'ring', 'disjoint']

describe('sampler', () => {
  it('每种预设分布的真实样本张量形状为 [n,2] 且落在合理范围', () => {
    for (const d of DISTS) {
      const t = sampleReal(50, d, tf)
      expect(t.shape).toEqual([50, 2])
      const arr = t.arraySync() as number[][]
      // 分布定义在单位方格附近，允许少量噪声越界
      expect(arr.every((p) => p[0] > -0.3 && p[0] < 1.3 && p[1] > -0.3 && p[1] < 1.3)).toBe(true)
      t.dispose()
    }
  })

  it('自绘分布在无绘制点时回退到中心', () => {
    expect(sampleTruePoint('drawing', [])).toEqual([0.5, 0.5])
  })

  it('噪声 / 流形网格 / 判别器网格形状正确', () => {
    const z = sampleNoise(64, tf, 2)
    expect(z.shape).toEqual([64, 2])
    const m = manifoldNoiseGrid(20, tf)
    expect(m.shape).toEqual([21 * 21, 2])
    const g = discriminatorGrid(40, tf)
    expect(g.shape).toEqual([40 * 40, 2])
    tf.dispose([z, m, g])
  })
})

describe('GANLabModel', () => {
  it('生成器输出 [n,2] 且落在 (0,1)', () => {
    const model = new GANLabModel(tf, {})
    const z = sampleNoise(32, tf, model.noiseSize)
    const out = model.generator(z)
    expect(out.shape).toEqual([32, 2])
    const arr = out.dataSync()
    expect(Array.from(arr).every((v) => v >= 0 && v <= 1)).toBe(true)
    tf.dispose([z, out])
    model.dispose()
  })

  it('判别器输出 [n,1] 概率', () => {
    const model = new GANLabModel(tf, {})
    const x = sampleReal(32, 'ring', tf)
    const out = model.discriminator(x)
    expect(out.shape).toEqual([32, 1])
    const arr = out.dataSync()
    expect(Array.from(arr).every((v) => v >= 0 && v <= 1)).toBe(true)
    tf.dispose([x, out])
    model.dispose()
  })

  it.each(['log', 'leastSq'] as const)('%s 损失为有限标量', (lossType) => {
    const model = new GANLabModel(tf, { lossType })
    const real = sampleReal(32, 'gaussians', tf)
    const z = sampleNoise(32, tf, model.noiseSize)
    const fake = model.generator(z)
    const d = model.dLoss(model.discriminator(real), model.discriminator(fake))
    const g = model.gLoss(model.discriminator(fake))
    expect(Number.isFinite(d.dataSync()[0])).toBe(true)
    expect(Number.isFinite(g.dataSync()[0])).toBe(true)
    tf.dispose([real, z, fake, d, g])
    model.dispose()
  })

  it('训练一步能下降判别器损失方向（梯度非零）', () => {
    const model = new GANLabModel(tf, {})
    const grads = tf.grads((pts) => model.gLoss(model.discriminator(pts as tf.Tensor2D)))
    const pts = sampleReal(16, 'gaussians', tf)
    const [grad] = grads([pts]) as tf.Tensor2D[]
    const norm = grad.abs().sum().dataSync()[0]
    expect(norm).toBeGreaterThan(0)
    tf.dispose([pts, grad])
    model.dispose()
  })
})
