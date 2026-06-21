"use client"
import { useCallback, useEffect, useRef, useState } from 'react'
import type * as tfType from '@tensorflow/tfjs'
import { GANLabModel, LossType } from '@/lib/ganModel'
import {
  IMG_DIM,
  LATENT_DIM,
  TARGET_IMAGES,
  sampleNoise,
  sampleReal,
  targetsTensor,
} from '@/lib/sampler'

type TF = typeof tfType

const NUM_CANDIDATES = 24 // 内部生成的候选图数量（只展示其中最好的一张）
const REFRESH_EVERY = 3
const MAX_LOSS_POINTS = 200
const REACHED_THRESHOLD = 0.85 // 收敛度达到即判定"达到目标"并自动停止
const NOISE_DECAY_STEPS = 600 // 实例噪声在此步数内衰减
const NOISE_MAX = 0.1 // 实例噪声初始强度
const NOISE_FLOOR = 0.03 // 实例噪声下限（不降到 0，避免判别器过强）
const ADV_WEIGHT = 0.3 // 对抗项权重（调低，让重建项主导以稳定收敛）
const RECON_WEIGHT = 15 // 重建引导项权重
const HIDDEN = 160 // 生成器/判别器隐藏层宽度
const MAX_AUTO_STEPS = 800 // 训练步数硬上限，保证一定会停下来

export interface VizState {
  tf: TF | null
  model: GANLabModel | null
  bestImage: number[] // 当前最佳生成图（最接近某个目标），长度 IMG_DIM
  bestTargetName: string // 该最佳图匹配到的目标名
}

export interface GANTrainingOptions {
  lr?: number
  batch?: number
  lossType?: LossType
}

export function useGANTraining(initial: GANTrainingOptions = {}) {
  const tfRef = useRef<TF | null>(null)
  const stateRef = useRef<VizState>({ tf: null, model: null, bestImage: [], bestTargetName: '' })
  const seedsRef = useRef<tfType.Tensor2D | null>(null)
  const baselineRef = useRef<number | null>(null)
  const optsRef = useRef<{ g: tfType.Optimizer; d: tfType.Optimizer } | null>(null)
  const runningRef = useRef(false)
  const reachedRef = useRef(false) // 供训练循环判断是否自动停止
  const stepCountRef = useRef(0) // 用于实例噪声衰减计划

  const cfgRef = useRef({
    lr: initial.lr ?? 0.001,
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
    seedsRef.current = tf.randomNormal([NUM_CANDIDATES, LATENT_DIM]) as tfType.Tensor2D
  }, [])

  const refreshViz = useCallback(() => {
    const tf = tfRef.current
    const model = stateRef.current.model
    const seeds = seedsRef.current
    if (!tf || !model || !seeds) return

    const out = tf.tidy(() => {
      const gen = model.generator(seeds) // [N, IMG_DIM]
      const targets = targetsTensor(tf) // [K, IMG_DIM]
      // 每张生成图到每个目标图的均方距离
      const g3 = gen.reshape([NUM_CANDIDATES, 1, IMG_DIM])
      const t3 = targets.reshape([1, targets.shape[0], IMG_DIM])
      const dist = g3.sub(t3).square().mean(2) // [N, K]
      return {
        images: gen.arraySync() as number[][],
        dist: dist.arraySync() as number[][],
      }
    })

    // 在 JS 里挑出"最接近某个目标"的那一张候选图
    const K = TARGET_IMAGES.length
    let best = 0
    let bestMse = Infinity
    let bestK = 0
    for (let i = 0; i < out.dist.length; i++) {
      let kMin = 0
      for (let k = 1; k < K; k++) if (out.dist[i][k] < out.dist[i][kMin]) kMin = k
      if (out.dist[i][kMin] < bestMse) {
        bestMse = out.dist[i][kMin]
        best = i
        bestK = kMin
      }
    }

    stateRef.current.bestImage = out.images[best]
    stateRef.current.bestTargetName = TARGET_IMAGES[bestK].name

    if (baselineRef.current == null) baselineRef.current = Math.max(bestMse, 1e-4)
    const conv = Math.min(1, Math.max(0, 1 - bestMse / baselineRef.current))
    setConvergence(conv)
    if (conv >= REACHED_THRESHOLD) {
      reachedRef.current = true
      setReached(true)
    }
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
      const model = new GANLabModel(tf, { hidden: HIDDEN, lossType: cfgRef.current.lossType })
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

    // 实例噪声随训练衰减（保留下限），缓解判别器过强；重建引导项保证可靠收敛
    const n = stepCountRef.current
    const sd = Math.max(NOISE_FLOOR, NOISE_MAX * (1 - n / NOISE_DECAY_STEPS))
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
          const adv = model.gLoss(model.discriminator(fakeN)).mul(ADV_WEIGHT)
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
      // 收敛达标或到达步数上限即自动停止
      if (reachedRef.current || stepCountRef.current >= MAX_AUTO_STEPS) {
        runningRef.current = false
        break
      }
      await new Promise((r) => setTimeout(r, cfgRef.current.slowMo ? 200 : 0))
    }
    setRunning(false)
  }, [step])

  const start = useCallback(() => {
    if (reachedRef.current || runningRef.current) return
    loop()
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
    reachedRef.current = false
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
