"use client"
import React, { useState } from 'react'
import { TopControls } from './TopControls'
import { DistributionSelector } from './DistributionSelector'
import { GANGraph } from './GANGraph'
import { LayeredDistributions, LayerToggles } from './LayeredDistributions'
import { MetricsPanel } from './MetricsPanel'
import { Article } from './Article'
import { useGANTraining } from '@/hooks/useGANTraining'
import type { Distribution } from '@/lib/sampler'
import type { LossType } from '@/lib/ganModel'

const LAYER_LABELS: { key: keyof LayerToggles; label: string; color: string }[] = [
  { key: 'heatmap', label: '判别器热力图', color: '#7c3aed' },
  { key: 'manifold', label: '生成器流形', color: '#f97316' },
  { key: 'real', label: '真实样本', color: '#10b981' },
  { key: 'fake', label: '生成样本', color: '#7c3aed' },
  { key: 'gradients', label: '梯度箭头', color: '#ec4899' },
]

export default function GANLab() {
  const [lr, setLrState] = useState(0.02)
  const [batch, setBatchState] = useState(64)
  const [distribution, setDistributionState] = useState<Distribution>('gaussians')
  const [lossType, setLossTypeState] = useState<LossType>('log')
  const [slowMo, setSlowMoState] = useState(false)
  const [layers, setLayers] = useState<LayerToggles>({
    heatmap: true,
    manifold: true,
    real: true,
    fake: true,
    gradients: true,
  })

  const trainer = useGANTraining({ lr, batch, distribution, lossType })
  const {
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
  } = trainer

  return (
    <div className="space-y-4">
      <TopControls
        running={running}
        ready={ready}
        onToggle={() => (running ? stop() : start())}
        onStep={() => step()}
        onReset={reset}
        steps={steps}
        lr={lr}
        setLr={(v) => {
          setLrState(v)
          setLr(v)
        }}
        batch={batch}
        setBatch={(v) => {
          setBatchState(v)
          setBatch(v)
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

      <GANGraph stateRef={stateRef} vizVersion={vizVersion} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-4">
          <DistributionSelector
            value={distribution}
            onChange={(d) => {
              setDistributionState(d)
              setDistribution(d)
            }}
            onDrawingChange={setDrawing}
          />
          <MetricsPanel genLoss={genLoss} disLoss={disLoss} divergence={divergence} />
        </div>

        <div className="lg:col-span-8">
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-700">分层分布视图</h3>
              {!ready && <span className="text-xs text-stone-400">正在加载 TensorFlow.js…</span>}
            </div>
            <div className="mx-auto max-w-[460px]">
              <LayeredDistributions stateRef={stateRef} vizVersion={vizVersion} layers={layers} />
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              {LAYER_LABELS.map((l) => (
                <label key={l.key} className="flex items-center gap-1.5 text-xs text-stone-600">
                  <input
                    type="checkbox"
                    checked={layers[l.key]}
                    onChange={(e) => setLayers((s) => ({ ...s, [l.key]: e.target.checked }))}
                  />
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: l.color }} />
                  {l.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Article />
    </div>
  )
}
