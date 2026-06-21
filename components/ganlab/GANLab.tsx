"use client"
import React, { useState } from 'react'
import { TopControls } from './TopControls'
import { GANGraph } from './GANGraph'
import { GeneratedResult } from './GeneratedResult'
import { TargetGrid } from './TargetGrid'
import { MetricsPanel } from './MetricsPanel'
import { Article } from './Article'
import { useGANTraining } from '@/hooks/useGANTraining'
import type { LossType } from '@/lib/ganModel'

export default function GANLab() {
  const [lr, setLrState] = useState(0.001)
  const [lossType, setLossTypeState] = useState<LossType>('log')
  const [slowMo, setSlowMoState] = useState(false)

  const trainer = useGANTraining({ lr, lossType })
  const {
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
    setLossType,
    setSlowMo,
  } = trainer

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <TopControls
        running={running}
        ready={ready}
        reached={reached}
        onToggle={() => {
          if (reached) {
            // 已收敛：再次点击则重置并从头训练
            reset()
            requestAnimationFrame(() => start())
          } else if (running) {
            stop()
          } else {
            start()
          }
        }}
        onStep={() => step()}
        onReset={reset}
        steps={steps}
        lr={lr}
        setLr={(v) => {
          setLrState(v)
          setLr(v)
        }}
        lossType={lossType}
        setLossType={(t) => {
          setLossTypeState(t)
          setLossType(t)
        }}
        slowMo={slowMo}
        setSlowMo={(v) => {
          setSlowMoState(v)
          setSlowMo(v)
        }}
      />

      {!ready && (
        <div className="text-center text-xs text-stone-400">正在加载 TensorFlow.js…</div>
      )}

      <GANGraph stateRef={stateRef} vizVersion={vizVersion} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <GeneratedResult stateRef={stateRef} vizVersion={vizVersion} reached={reached} />
        </div>
        <div className="space-y-4 lg:col-span-5">
          <MetricsPanel
            genLoss={genLoss}
            disLoss={disLoss}
            convergence={convergence}
            reached={reached}
          />
          <TargetGrid />
        </div>
      </div>

      <Article />
    </div>
  )
}
