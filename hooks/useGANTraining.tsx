"use client"
import { useEffect, useRef, useState } from 'react'
import type * as tfType from '@tensorflow/tfjs'
import { createGenerator, createDiscriminator } from '@/lib/ganModel'
import { sampleNoise, sampleReal, Distribution } from '@/lib/sampler'

export function useGANTraining(initial: { lr?: number; batch?: number; distribution?: Distribution } = {}) {
  const tfRef = useRef<any>(null)
  const stateRef = useRef<any>({})
  const runningRef = useRef(false)
  const [running, setRunning] = useState(false)
  const [genLoss, setGenLoss] = useState<number[]>([])
  const [disLoss, setDisLoss] = useState<number[]>([])
  const [steps, setSteps] = useState(0)
  const [epoch, setEpoch] = useState(0)
  const [divergence, setDivergence] = useState(0)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const tf = await import('@tensorflow/tfjs')
      await tf.setBackend('webgl')
      tfRef.current = tf

      const gen = createGenerator(tf)
      const dis = createDiscriminator(tf)

      const gOpt = tf.train.adam(initial.lr ?? 0.001)
      const dOpt = tf.train.adam(initial.lr ?? 0.001)

      dis.compile({ optimizer: dOpt, loss: 'binaryCrossentropy' })

      stateRef.current = { tf, gen, dis, gOpt, dOpt, distribution: initial.distribution ?? 'gaussian', batch: initial.batch ?? 64 }
      if (!mounted) return
    })()
    return () => { mounted = false }
  }, [])

  async function step() {
    const s = stateRef.current
    if (!s || !s.tf) return
    const tf = s.tf
    const batch = s.batch || 64

    // discriminator
    const real = sampleReal(batch, s.distribution as Distribution, tf)
    const z = sampleNoise(batch, tf)
    const fake = s.gen.predict(z) as any
    const x = tf.concat([real, fake], 0)
    const y = tf.concat([tf.ones([batch, 1]), tf.zeros([batch, 1])], 0)

    const dLoss = await s.dis.trainOnBatch(x, y) as number

    // generator
    const genLossTensor = s.gOpt.minimize(() => {
      const z2 = sampleNoise(batch, tf)
      const gOut = s.gen.apply(z2) as any
      const dOut = s.dis.apply(gOut) as any
      const loss = tf.losses.logLoss(tf.onesLike(dOut), dOut)
      return loss
    }, true) as any

    const gLoss = genLossTensor ? genLossTensor.dataSync()[0] : 0
    if (genLossTensor) genLossTensor.dispose()

    tf.dispose([real, z, fake, x, y])

    setGenLoss(prev => prev.concat(gLoss).slice(-1000))
    setDisLoss(prev => prev.concat(dLoss as number).slice(-1000))
    setSteps(s => s + 1)

    // compute simple divergence snapshot (lightweight)
    try {
      const grid = 32
      const coords: number[][] = []
      for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) coords.push([x / (grid - 1), y / (grid - 1)])
      const pts = tf.tensor2d(coords)
      const preds = s.dis.predict(pts) as any
      const probs = preds.dataSync()
      // simple metric: variance of probs distance from 0.5
      let v = 0
      for (let i = 0; i < probs.length; i++) v += Math.abs(probs[i] - 0.5)
      setDivergence(v / probs.length)
      tf.dispose([pts, preds])
    } catch (e) {}

    return { gLoss, dLoss }
  }

  async function loop() {
    setRunning(true)
    runningRef.current = true
    while (runningRef.current) {
      await step()
      await new Promise(r => setTimeout(r, 0))
    }
    setRunning(false)
  }

  function start() { if (!runningRef.current) loop() }
  function stop() { runningRef.current = false }
  function reset() {
    const s = stateRef.current
    if (!s || !s.tf) return
    s.gen = createGenerator(s.tf)
    s.dis = createDiscriminator(s.tf)
    s.dis.compile({ optimizer: s.dOpt, loss: 'binaryCrossentropy' })
    setGenLoss([]); setDisLoss([]); setSteps(0); setEpoch(0)
  }

  function setDistribution(d: Distribution) { if (stateRef.current) stateRef.current.distribution = d }
  function setBatchSize(b: number) { if (stateRef.current) stateRef.current.batch = b }

  return {
    stateRef,
    tfRef,
    start,
    stop,
    step,
    reset,
    running,
    genLoss,
    disLoss,
    steps,
    epoch,
    divergence,
    setDistribution,
    setBatchSize
  }
}
