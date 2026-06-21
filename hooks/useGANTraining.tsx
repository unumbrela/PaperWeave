"use client"
import { useCallback, useEffect, useRef, useState } from 'react'
import type * as tfType from '@tensorflow/tfjs'
import { GANLabModel, LossType } from '@/lib/ganModel'
import { IMG_DIM, LATENT_DIM, sampleNoise, sampleReal, targetsTensor } from '@/lib/sampler'

type TF = typeof tfType

const NUM_DISPLAY = 16 // 4×4 展示网格
const REFRESH_EVERY = 3
const MAX_LOSS_POINTS = 200
const REACHED_THRESHOLD = 0.82 // 收敛度达到即判定"达到目标"
const NOISE_DECAY_STEPS = 600 // 实例噪声在此步数内衰减到 0
const RECON_WEIGHT = 5 // 重建引导项权重

export interface VizState {
  tf: TF | null
  model: GANLabModel | null
  displayImages: number[][] // 固定种子生成的图像，每张长度 IMG_DIM
}

export interface GANTrainingOptions {
  lr?: number
  batch?: number
  lossType?: LossType
}

export function useGANTraining(initial: GANTrainingOptions = {}) {
  const tfRef = useRef<TF | null>(null)
  const stateRef = useRef<VizState>({ tf: null, model: null, displayImages: [] })
  const seedsRef = useRef<tfType.Tensor2D | null>(null)
  const baselineRef = useRef<number | null>(null)
  const optsRef = useRef<{ g: tfType.Optimizer; d: tfType.Optimizer } | null>(null)
  const runningRef = useRef(false)
  const stepCountRef = useRef(0) // 用于实例噪声衰减计划

  const cfgRef = useRef({
    lr: initial.lr ?? 0.002,
    batch: initial.batch ?? 64,
    lossType: initial.lossType ?? ('log' as LossType),
    slowMo: false,
  })

  const [ready, setReady] = useState(false)
  const [running, setRunning] = useState(false)
  const [genLoss, setGenLoss] = useState<number[]>([])
  const [disLoss, setDisLoss] = useState<number[]>([])
  const [steps, setSteps] = useState(0)
  const [convergence, setConvergence] = useState(0)
  const [reached, setReached] = useState(false)
  const [vizVersion, setVizVersion] = useState(0)

  const makeOptimizers = useCallback((tf: TF, lr: number) => {
    optsRef.current?.g.dispose()
    optsRef.current?.d.dispose()
    // beta1=0.5 是 GAN 训练的常用稳定设置
    optsRef.current = { g: tf.train.adam(lr, 0.5, 0.999), d: tf.train.adam(lr, 0.5, 0.999) }
  }, [])

  const newSeeds = useCallback((tf: TF) => {
    seedsRef.current?.dispose()
    seedsRef.current = tf.randomNormal([NUM_DISPLAY, LATENT_DIM]) as tfType.Tensor2D
  }, [])

  const refreshViz = useCallback(() => {
    const tf = tfRef.current
    const model = stateRef.current.model
    const seeds = seedsRef.current
    if (!tf || !model || !seeds) return

    const out = tf.tidy(() => {
      const gen = model.generator(seeds) // [N, IMG_DIM]
      const targets = targetsTensor(tf) // [K, IMG_DIM]
      // 每张生成图到最近目标图的均方距离
      const g3 = gen.reshape([NUM_DISPLAY, 1, IMG_DIM])
      const t3 = targets.reshape([1, targets.shape[0], IMG_DIM])
      const dist = g3.sub(t3).square().mean(2) // [N, K]
      const nearest = dist.min(1).mean() // 标量
      return {
        images: gen.arraySync() as number[][],
        mse: nearest.dataSync()[0],
      }
    })

    stateRef.current.displayImages = out.images
    if (baselineRef.current == null) baselineRef.current = Math.max(out.mse, 1e-4)
    const conv = Math.min(1, Math.max(0, 1 - out.mse / baselineRef.current))
    setConvergence(conv)
    if (conv >= REACHED_THRESHOLD) setReached(true)
    setVizVersion((v) => v + 1)
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const tf = await import('@tensorflow/tfjs')
      try {
        await tf.setBackend('webgl')
      } catch {
        await tf.setBackend('cpu')
      }
      await tf.ready()
      if (!mounted) return
      tfRef.current = tf
      const model = new GANLabModel(tf, { lossType: cfgRef.current.lossType })
      stateRef.current.tf = tf
      stateRef.current.model = model
      newSeeds(tf)
      makeOptimizers(tf, cfgRef.current.lr)
      setReady(true)
      refreshViz()
    })()
    return () => {
      mounted = false
      runningRef.current = false
      stateRef.current.model?.dispose()
      seedsRef.current?.dispose()
      optsRef.current?.g.dispose()
      optsRef.current?.d.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const step = useCallback(() => {
    const tf = tfRef.current
    const model = stateRef.current.model
    const opt = optsRef.current
    if (!tf || !model || !opt) return
    const batch = cfgRef.current.batch

    // 实例噪声随训练衰减，缓解判别器过强；重建引导项保证可靠收敛到目标
    const n = stepCountRef.current
    const sd = 0.3 * Math.max(0, 1 - n / NOISE_DECAY_STEPS)
    stepCountRef.current = n + 1

    const dCost = opt.d.minimize(
      () =>
        tf.tidy(() => {
          const real = sampleReal(batch, tf)
          const z = sampleNoise(batch, tf)
          const fake = model.generator(z)
          const realN = real.add(tf.randomNormal(real.shape, 0, sd)) as tfType.Tensor2D
          const fakeN = fake.add(tf.randomNormal(fake.shape, 0, sd)) as tfType.Tensor2D
          return model.dLoss(model.discriminator(realN), model.discriminator(fakeN))
        }),
      true,
      model.dVariables,
    )
    const gCost = opt.g.minimize(
      () =>
        tf.tidy(() => {
          const fake = model.generator(sampleNoise(batch, tf))
          const fakeN = fake.add(tf.randomNormal(fake.shape, 0, sd)) as tfType.Tensor2D
          const adv = model.gLoss(model.discriminator(fakeN))
          return adv.add(model.reconLoss(fake).mul(RECON_WEIGHT)) as tfType.Scalar
        }),
      true,
      model.gVariables,
    )

    const d = dCost ? dCost.dataSync()[0] : 0
    const g = gCost ? gCost.dataSync()[0] : 0
    dCost?.dispose()
    gCost?.dispose()

    setDisLoss((p) => p.concat(d).slice(-MAX_LOSS_POINTS))
    setGenLoss((p) => p.concat(g).slice(-MAX_LOSS_POINTS))
    setSteps((n) => {
      const next = n + 1
      if (next % REFRESH_EVERY === 0) refreshViz()
      return next
    })
  }, [refreshViz])

  const loop = useCallback(async () => {
    runningRef.current = true
    setRunning(true)
    while (runningRef.current) {
      step()
      await new Promise((r) => setTimeout(r, cfgRef.current.slowMo ? 200 : 0))
    }
    setRunning(false)
  }, [step])

  const start = useCallback(() => {
    if (!runningRef.current) loop()
  }, [loop])
  const stop = useCallback(() => {
    runningRef.current = false
  }, [])

  const reset = useCallback(() => {
    const tf = tfRef.current
    const model = stateRef.current.model
    if (!tf || !model) return
    model.initializeVariables()
    makeOptimizers(tf, cfgRef.current.lr)
    newSeeds(tf)
    stepCountRef.current = 0
    baselineRef.current = null
    setGenLoss([])
    setDisLoss([])
    setSteps(0)
    setConvergence(0)
    setReached(false)
    refreshViz()
  }, [makeOptimizers, newSeeds, refreshViz])

  const setLr = useCallback(
    (lr: number) => {
      cfgRef.current.lr = lr
      const tf = tfRef.current
      if (tf) makeOptimizers(tf, lr)
    },
    [makeOptimizers],
  )
  const setBatch = useCallback((b: number) => {
    cfgRef.current.batch = b
  }, [])
  const setLossType = useCallback((t: LossType) => {
    cfgRef.current.lossType = t
    if (stateRef.current.model) stateRef.current.model.lossType = t
  }, [])
  const setSlowMo = useCallback((v: boolean) => {
    cfgRef.current.slowMo = v
  }, [])

  return {
    stateRef,
    ready,
    running,
    genLoss,
    disLoss,
    steps,
    convergence,
    reached,
    vizVersion,
    start,
    stop,
    step,
    reset,
    setLr,
    setBatch,
    setLossType,
    setSlowMo,
  }
}
