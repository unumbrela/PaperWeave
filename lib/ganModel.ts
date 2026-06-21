import type * as tfType from '@tensorflow/tfjs'
import { IMG_DIM, LATENT_DIM } from './sampler'

type TF = typeof tfType
type Tensor2D = tfType.Tensor2D
type Variable = tfType.Variable
type Scalar = tfType.Scalar

export type LossType = 'log' | 'leastSq'

export interface GANLabConfig {
  hidden?: number
  lossType?: LossType
}

const EPS = 1e-7
const LEAK = 0.2

/**
 * 小型图像生成 GAN：隐变量 z -> 16x16 灰度图。
 * 用手写 tf.variable 计算图，配合 optimizer.minimize 的 varList 分别更新 G/D。
 * 目标是让生成器复刻一小组固定目标图，点开始后可靠快速收敛。
 */
export class GANLabModel {
  readonly hidden: number
  lossType: LossType
  gVariables: Variable[] = []
  dVariables: Variable[] = []

  constructor(private tf: TF, config: GANLabConfig = {}) {
    this.hidden = config.hidden ?? 128
    this.lossType = config.lossType ?? 'log'
    this.initializeVariables()
  }

  initializeVariables() {
    const tf = this.tf
    this.dispose()
    const h = this.hidden
    // He 初始化（适配 relu / leakyRelu）
    const w = (rows: number, cols: number) =>
      tf.variable(tf.randomNormal([rows, cols], 0, Math.sqrt(2 / rows)))
    const b = (n: number) => tf.variable(tf.zeros([n]))

    // 生成器：LATENT -> h -> h -> IMG_DIM (sigmoid)
    this.gVariables = [
      w(LATENT_DIM, h), b(h),
      w(h, h), b(h),
      w(h, IMG_DIM), b(IMG_DIM),
    ]
    // 判别器：IMG_DIM -> h -> 1 (sigmoid)
    this.dVariables = [
      w(IMG_DIM, h), b(h),
      w(h, 1), b(1),
    ]
  }

  generator(z: Tensor2D): Tensor2D {
    const v = this.gVariables
    let net = z.matMul(v[0] as Tensor2D).add(v[1]).relu() as Tensor2D
    net = net.matMul(v[2] as Tensor2D).add(v[3]).relu() as Tensor2D
    return net.matMul(v[4] as Tensor2D).add(v[5]).sigmoid() as Tensor2D
  }

  discriminator(x: Tensor2D): Tensor2D {
    const tf = this.tf
    const v = this.dVariables
    const net = tf.leakyRelu(x.matMul(v[0] as Tensor2D).add(v[1]), LEAK) as Tensor2D
    return net.matMul(v[2] as Tensor2D).add(v[3]).sigmoid() as Tensor2D
  }

  dLoss(realPred: Tensor2D, fakePred: Tensor2D): Scalar {
    const tf = this.tf
    if (this.lossType === 'leastSq') {
      return tf.add(realPred.sub(1).square().mean(), fakePred.square().mean()) as Scalar
    }
    const real = realPred.clipByValue(EPS, 1)
    const fake = fakePred.clipByValue(EPS, 1 - EPS)
    // 0.9 标签平滑，提升稳定性
    return tf.add(real.log().mul(0.9).mean(), tf.sub(1, fake).log().mean()).mul(-1) as Scalar
  }

  gLoss(fakePred: Tensor2D): Scalar {
    if (this.lossType === 'leastSq') {
      return fakePred.sub(1).square().mean() as Scalar
    }
    return fakePred.clipByValue(EPS, 1).log().mean().mul(-1) as Scalar
  }

  /**
   * 重建引导项：每张生成图到「选定目标图」的均方距离。
   * 与对抗损失加权相加，保证演示能可靠收敛到指定目标（类似 cGAN 的 L1 引导）。
   * @param target 选定目标张量 [1, IMG_DIM]，与 fake 广播相减。
   */
  reconLoss(fake: Tensor2D, target: Tensor2D): Scalar {
    return fake.sub(target).square().mean() as Scalar
  }

  dispose() {
    this.gVariables.forEach((v) => v.dispose())
    this.dVariables.forEach((v) => v.dispose())
    this.gVariables = []
    this.dVariables = []
  }
}
