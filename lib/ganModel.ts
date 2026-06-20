import type * as tfType from '@tensorflow/tfjs'

type TF = typeof tfType
type Tensor2D = tfType.Tensor2D
type Variable = tfType.Variable
type Scalar = tfType.Scalar

export type LossType = 'log' | 'leastSq'

export interface GANLabConfig {
  noiseSize?: number
  numGeneratorLayers?: number
  numDiscriminatorLayers?: number
  numGeneratorNeurons?: number
  numDiscriminatorNeurons?: number
  lossType?: LossType
}

const EPS = 1e-7

/**
 * 手写 tf.variable 计算图版 GAN，移植自 poloclub/ganlab (Apache-2.0)。
 * 之所以不用 Keras tf.sequential，是因为要对"生成样本的输出位置"求梯度，
 * 才能画出 GAN Lab 的生成器流形与梯度箭头可视化。
 */
export class GANLabModel {
  readonly noiseSize: number
  readonly numGeneratorLayers: number
  readonly numDiscriminatorLayers: number
  readonly numGeneratorNeurons: number
  readonly numDiscriminatorNeurons: number
  lossType: LossType

  gVariables: Variable[] = []
  dVariables: Variable[] = []

  constructor(private tf: TF, config: GANLabConfig = {}) {
    this.noiseSize = config.noiseSize ?? 2
    this.numGeneratorLayers = config.numGeneratorLayers ?? 1
    this.numDiscriminatorLayers = config.numDiscriminatorLayers ?? 1
    this.numGeneratorNeurons = config.numGeneratorNeurons ?? 32
    this.numDiscriminatorNeurons = config.numDiscriminatorNeurons ?? 32
    this.lossType = config.lossType ?? 'log'
    this.initializeVariables()
  }

  initializeVariables() {
    const tf = this.tf
    this.dispose()
    this.gVariables = []
    this.dVariables = []

    const normal = (shape: number[], fanIn: number) =>
      tf.variable(tf.randomNormal(shape, 0, 1.0 / Math.sqrt(fanIn)))
    const zeros = (n: number) => tf.variable(tf.zeros([n]))

    // Generator: noiseSize -> neurons -> [hidden] -> 2
    this.gVariables.push(normal([this.noiseSize, this.numGeneratorNeurons], 2))
    this.gVariables.push(zeros(this.numGeneratorNeurons))
    for (let i = 0; i < this.numGeneratorLayers; ++i) {
      this.gVariables.push(
        normal([this.numGeneratorNeurons, this.numGeneratorNeurons], this.numGeneratorNeurons),
      )
      this.gVariables.push(zeros(this.numGeneratorNeurons))
    }
    this.gVariables.push(normal([this.numGeneratorNeurons, 2], this.numGeneratorNeurons))
    this.gVariables.push(zeros(2))

    // Discriminator: 2 -> neurons -> [hidden] -> 1
    this.dVariables.push(normal([2, this.numDiscriminatorNeurons], 2))
    this.dVariables.push(zeros(this.numDiscriminatorNeurons))
    for (let i = 0; i < this.numDiscriminatorLayers; ++i) {
      this.dVariables.push(
        normal(
          [this.numDiscriminatorNeurons, this.numDiscriminatorNeurons],
          this.numDiscriminatorNeurons,
        ),
      )
      this.dVariables.push(zeros(this.numDiscriminatorNeurons))
    }
    this.dVariables.push(normal([this.numDiscriminatorNeurons, 1], this.numDiscriminatorNeurons))
    this.dVariables.push(zeros(1))
  }

  generator(noise: Tensor2D): Tensor2D {
    const v = this.gVariables
    let net = noise.matMul(v[0] as Tensor2D).add(v[1]).relu() as Tensor2D
    for (let i = 0; i < this.numGeneratorLayers; ++i) {
      net = net.matMul(v[2 + i * 2] as Tensor2D).add(v[3 + i * 2]).relu() as Tensor2D
    }
    const lastW = v[2 + this.numGeneratorLayers * 2] as Tensor2D
    const lastB = v[3 + this.numGeneratorLayers * 2]
    // tanh -> (-1,1); 画布坐标系下平移缩放到 (0,1)。
    return net.matMul(lastW).add(lastB).tanh().mul(0.5).add(0.5) as Tensor2D
  }

  discriminator(input: Tensor2D): Tensor2D {
    const v = this.dVariables
    let net = input.matMul(v[0] as Tensor2D).add(v[1]).relu() as Tensor2D
    for (let i = 0; i < this.numDiscriminatorLayers; ++i) {
      net = net.matMul(v[2 + i * 2] as Tensor2D).add(v[3 + i * 2]).relu() as Tensor2D
    }
    const lastW = v[2 + this.numDiscriminatorLayers * 2] as Tensor2D
    const lastB = v[3 + this.numDiscriminatorLayers * 2]
    return net.matMul(lastW).add(lastB).sigmoid() as Tensor2D
  }

  dLoss(realPred: Tensor2D, fakePred: Tensor2D): Scalar {
    const tf = this.tf
    if (this.lossType === 'leastSq') {
      return tf.add(
        realPred.sub(1).square().mean(),
        fakePred.square().mean(),
      ) as Scalar
    }
    const real = realPred.clipByValue(EPS, 1)
    const fake = fakePred.clipByValue(EPS, 1 - EPS)
    // 0.95 标签平滑
    return tf
      .add(real.log().mul(0.95).mean(), tf.sub(1, fake).log().mean())
      .mul(-1) as Scalar
  }

  gLoss(fakePred: Tensor2D): Scalar {
    if (this.lossType === 'leastSq') {
      return fakePred.sub(1).square().mean() as Scalar
    }
    return fakePred.clipByValue(EPS, 1).log().mean().mul(-1) as Scalar
  }

  dispose() {
    this.gVariables.forEach((v) => v.dispose())
    this.dVariables.forEach((v) => v.dispose())
    this.gVariables = []
    this.dVariables = []
  }
}
