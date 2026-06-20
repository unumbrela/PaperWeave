"use client"
import { useCallback, useEffect, useRef, useState } from 'react'
import type * as tfType from '@tensorflow/tfjs'
import { GANLabModel, LossType } from '@/lib/ganModel'
import {
  Distribution,
  DrawingPositions,
  discriminatorGrid,
  manifoldNoiseGrid,
  sampleNoise,
  sampleReal,
} from '@/lib/sampler'

type TF = typeof tfType

// 可视化参数
const NUM_SAMPLES = 300 // 叠加显示的真/假样本数
const NUM_GRADIENTS = 80 // 梯度箭头数量
const MANIFOLD_CELLS = 20 // 流形网格分辨率
const HEATMAP_RES = 40 // 判别器热力图分辨率
const REFRESH_EVERY = 2 // 每多少步刷新一次可视化
const MAX_LOSS_POINTS = 200

export interface VizState {
  tf: TF | null
  model: GANLabModel | null
  realSamples: number[][]
  fakeSamples: number[][]
  manifoldVertices: number[][]
  manifoldCells: number
  gradSamples: number[][]
  gradVectors: number[][]
  heatmap: Float32Array | null
  heatmapRes: number
}

export interface GANTrainingOptions {
  lr?: number
  batch?: number
  distribution?: Distribution
  lossType?: LossType
  drawing?: DrawingPositions
}

function jsDivergence(real: number[][], fake: number[][], res: number): number {
  const rh = new Float64Array(res * res)
  const fh = new Float64Array(res * res)
  const bin = (p: number[]) => {
    const xi = Math.min(res - 1, Math.max(0, Math.floor(p[0] * res)))
    const yi = Math.min(res - 1, Math.max(0, Math.floor(p[1] * res)))
    return yi * res + xi
  }
  real.forEach((p) => (rh[bin(p)] += 1))
  fake.forEach((p) => (fh[bin(p)] += 1))
  const norm = (a: Float64Array) => {
    const s = a.reduce((x, y) => x + y, 0) || 1
    for (let i = 0; i < a.length; ++i) a[i] /= s
  }
  norm(rh)
  norm(fh)
  let js = 0
  for (let i = 0; i < rh.length; ++i) {
    const m = 0.5 * (rh[i] + fh[i])
    if (rh[i] > 0) js += 0.5 * rh[i] * Math.log(rh[i] / m)
    if (fh[i] > 0) js += 0.5 * fh[i] * Math.log(fh[i] / m)
  }
  return js
}

export function useGANTraining(initial: GANTrainingOptions = {}) {
  const tfRef = useRef<TF | null>(null)
  const stateRef = useRef<VizState>({
    tf: null,
    model: null,
    realSamples: [],
    fakeSamples: [],
    manifoldVertices: [],
    manifoldCells: MANIFOLD_CELLS,
    gradSamples: [],
    gradVectors: [],
    heatmap: null,
    heatmapRes: HEATMAP_RES,
  })

  // 训练配置放进 ref，避免闭包过期
  const cfgRef = useRef({
    lr: initial.lr ?? 0.02,
    batch: initial.batch ?? 64,
    distribution: initial.distribution ?? ('gaussians' as Distribution),
    lossType: initial.lossType ?? ('log' as LossType),
    drawing: initial.drawing ?? ([] as DrawingPositions),
    slowMo: false,
  })
  const optsRef = useRef<{ g: tfType.Optimizer; d: tfType.Optimizer } | null>(null)
  const runningRef = useRef(false)

  const [ready, setReady] = useState(false)
  const [running, setRunning] = useState(false)
  const [genLoss, setGenLoss] = useState<number[]>([])
  const [disLoss, setDisLoss] = useState<number[]>([])
  const [steps, setSteps] = useState(0)
  const [divergence, setDivergence] = useState(0)
  const [vizVersion, setVizVersion] = useState(0)

  const makeOptimizers = useCallback((tf: TF, lr: number) => {
    optsRef.current?.g.dispose()
    optsRef.current?.d.dispose()
    optsRef.current = { g: tf.train.adam(lr, 0.9, 0.999), d: tf.train.adam(lr, 0.9, 0.999) }
  }, [])

  const refreshViz = useCallback(() => {
    const tf = tfRef.current
    const model = stateRef.current.model
    if (!tf || !model) return
    const cfg = cfgRef.current

    const out = tf.tidy(() => {
      const real = sampleReal(NUM_SAMPLES, cfg.distribution, tf, cfg.drawing)
      const z = sampleNoise(NUM_SAMPLES, tf, model.noiseSize)
      const fake = model.generator(z)

      // 流形顶点
      const mGrid = manifoldNoiseGrid(MANIFOLD_CELLS, tf)
      const mOut = model.generator(mGrid)

      // 判别器热力图
      const hGrid = discriminatorGrid(HEATMAP_RES, tf)
      const hOut = model.discriminator(hGrid).reshape([HEATMAP_RES * HEATMAP_RES])

      // 梯度场：对生成样本位置求 gLoss 的下降方向
      const gradPts = (fake.slice([0, 0], [NUM_GRADIENTS, 2]) as tfType.Tensor2D)
      const gradFn = tf.grads((pts) =>
        model.gLoss(model.discriminator(pts as tfType.Tensor2D)),
      )
      const [grad] = gradFn([gradPts]) as tfType.Tensor2D[]

      return {
        real: real.arraySync() as number[][],
        fake: fake.arraySync() as number[][],
        manifold: mOut.arraySync() as number[][],
        heatmap: hOut.dataSync() as Float32Array,
        gradPts: gradPts.arraySync() as number[][],
        // 下降方向 = -grad
        gradVec: (grad.mul(-1).arraySync() as number[][]),
      }
    })

    const s = stateRef.current
    s.realSamples = out.real
    s.fakeSamples = out.fake
    s.manifoldVertices = out.manifold
    s.gradSamples = out.gradPts
    s.gradVectors = out.gradVec
    s.heatmap = Float32Array.from(out.heatmap)

    setDivergence(jsDivergence(out.real, out.fake, 20))
    setVizVersion((v) => v + 1)
  }, [])

  // 初始化 tf + 模型
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
      makeOptimizers(tf, cfgRef.current.lr)
      setReady(true)
      refreshViz()
    })()
    return () => {
      mounted = false
      runningRef.current = false
      stateRef.current.model?.dispose()
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
    const cfg = cfgRef.current
    const batch = cfg.batch

    // 判别器一步
    const dCost = opt.d.minimize(
      () =>
        tf.tidy(() => {
          const real = sampleReal(batch, cfg.distribution, tf, cfg.drawing)
          const z = sampleNoise(batch, tf, model.noiseSize)
          const fake = model.generator(z)
          return model.dLoss(model.discriminator(real), model.discriminator(fake))
        }),
      true,
      model.dVariables,
    )
    // 生成器一步
    const gCost = opt.g.minimize(
      () =>
        tf.tidy(() => {
          const z = sampleNoise(batch, tf, model.noiseSize)
          const fake = model.generator(z)
          return model.gLoss(model.discriminator(fake))
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
      const delay = cfgRef.current.slowMo ? 250 : 0
      await new Promise((r) => setTimeout(r, delay))
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
    setGenLoss([])
    setDisLoss([])
    setSteps(0)
    refreshViz()
  }, [makeOptimizers, refreshViz])

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
  const setDistribution = useCallback(
    (d: Distribution) => {
      cfgRef.current.distribution = d
      refreshViz()
    },
    [refreshViz],
  )
  const setDrawing = useCallback(
    (positions: DrawingPositions) => {
      cfgRef.current.drawing = positions
      if (cfgRef.current.distribution === 'drawing') refreshViz()
    },
    [refreshViz],
  )
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
    divergence,
    vizVersion,
    start,
    stop,
    step,
    reset,
    setLr,
    setBatch,
    setDistribution,
    setDrawing,
    setLossType,
    setSlowMo,
  }
}
