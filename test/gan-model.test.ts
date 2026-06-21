import { describe, it, expect, beforeAll } from 'vitest'
import * as tf from '@tensorflow/tfjs'
import { GANLabModel } from '@/lib/ganModel'
import {
  IMG_DIM,
  LATENT_DIM,
  TARGET_IMAGES,
  sampleNoise,
  sampleReal,
  targetsTensor,
} from '@/lib/sampler'

beforeAll(async () => {
  await tf.setBackend('cpu')
  await tf.ready()
})

function nearestTargetMSE(model: GANLabModel, seeds: tf.Tensor2D): number {
  return tf.tidy(() => {
    const gen = model.generator(seeds)
    const targets = targetsTensor(tf)
    const g3 = gen.reshape([seeds.shape[0], 1, IMG_DIM])
    const t3 = targets.reshape([1, targets.shape[0], IMG_DIM])
    return g3.sub(t3).square().mean(2).min(1).mean().dataSync()[0]
  })
}

describe('sampler / 目标图', () => {
  it('目标图为 6 张，像素长度正确且在 [0,1]', () => {
    expect(TARGET_IMAGES.length).toBe(6)
    for (const t of TARGET_IMAGES) {
      expect(t.pixels.length).toBe(IMG_DIM)
      expect(Array.from(t.pixels).every((v) => v >= 0 && v <= 1)).toBe(true)
    }
  })

  it('真实批与噪声形状正确', () => {
    const real = sampleReal(32, tf)
    const z = sampleNoise(32, tf)
    expect(real.shape).toEqual([32, IMG_DIM])
    expect(z.shape).toEqual([32, LATENT_DIM])
    tf.dispose([real, z])
  })
})

describe('GANLabModel / 图像生成', () => {
  it('生成器输出 [n, IMG_DIM] 且像素在 [0,1]', () => {
    const model = new GANLabModel(tf, {})
    const z = sampleNoise(8, tf)
    const out = model.generator(z)
    expect(out.shape).toEqual([8, IMG_DIM])
    expect(Array.from(out.dataSync()).every((v) => v >= 0 && v <= 1)).toBe(true)
    tf.dispose([z, out])
    model.dispose()
  })

  it('判别器输出 [n,1] 概率', () => {
    const model = new GANLabModel(tf, {})
    const x = sampleReal(8, tf)
    const out = model.discriminator(x)
    expect(out.shape).toEqual([8, 1])
    expect(Array.from(out.dataSync()).every((v) => v >= 0 && v <= 1)).toBe(true)
    tf.dispose([x, out])
    model.dispose()
  })

  it('训练若干步后，生成图到最近目标的 MSE 明显下降（收敛）', () => {
    const model = new GANLabModel(tf, {})
    const gOpt = tf.train.adam(0.002, 0.5, 0.999)
    const dOpt = tf.train.adam(0.002, 0.5, 0.999)
    const seeds = tf.randomNormal([16, LATENT_DIM]) as tf.Tensor2D
    const batch = 64

    const before = nearestTargetMSE(model, seeds)
    const STEPS = 600

    for (let i = 0; i < STEPS; i++) {
      // 实例噪声（对称加到真/假），随训练衰减，缓解判别器过强
      const sd = 0.3 * (1 - i / STEPS)
      dOpt.minimize(
        () =>
          tf.tidy(() => {
            const real = sampleReal(batch, tf)
            const z = sampleNoise(batch, tf)
            const fake = model.generator(z)
            const realN = real.add(tf.randomNormal(real.shape, 0, sd)) as tf.Tensor2D
            const fakeN = fake.add(tf.randomNormal(fake.shape, 0, sd)) as tf.Tensor2D
            return model.dLoss(model.discriminator(realN), model.discriminator(fakeN))
          }),
        false,
        model.dVariables,
      )
      gOpt.minimize(
        () =>
          tf.tidy(() => {
            const fake = model.generator(sampleNoise(batch, tf))
            const fakeN = fake.add(tf.randomNormal(fake.shape, 0, sd)) as tf.Tensor2D
            const adv = model.gLoss(model.discriminator(fakeN))
            return adv.add(model.reconLoss(fake).mul(5)) as tf.Scalar
          }),
        false,
        model.gVariables,
      )
    }

    const after = nearestTargetMSE(model, seeds)
    // 收敛：末态显著优于初态，且达到较低绝对水平（生成图清晰贴合目标）
    expect(after).toBeLessThan(before * 0.5)
    expect(after).toBeLessThan(0.05)

    tf.dispose([seeds])
    gOpt.dispose()
    dOpt.dispose()
    model.dispose()
  }, 60000)
})
