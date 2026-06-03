"use client"
import React, { useEffect, useRef, useState } from 'react'
import { DistributionSelector, Distribution } from './DistributionSelector'
import { LossChart } from './LossChart'
import { NetworkViz } from './NetworkViz'
import { TrainingStatus } from './TrainingStatus'
import { TopControls } from './TopControls'
import { LayeredDistributions } from './LayeredDistributions'
import { MetricsPanel } from './MetricsPanel'
import { Article } from './Article'
import { useGANTraining } from '@/hooks/useGANTraining'
import { DistributionView } from './DistributionView'
import { GANGraph } from './GANGraph'

// Enhanced GANLab: supports multiple target distributions, loss tracking, and status
export default function GANLab() {
  const [lr, setLr] = useState(0.001)
  const [batch, setBatch] = useState(64)
  const [distribution, setDistribution] = useState<Distribution>('gaussian')
  const [genLoss, setGenLoss] = useState<number[]>([])
  const [disLoss, setDisLoss] = useState<number[]>([])
  const [steps, setSteps] = useState(0)
  const [timePerStep, setTimePerStep] = useState(0)
  const [divergence, setDivergence] = useState(0)
  const [epoch, setEpoch] = useState(0)

  const trainer = useGANTraining({ lr: lr, batch: batch, distribution })
  const { stateRef, start, stop, step, reset, running: trainerRunning, genLoss: tGenLoss, disLoss: tDisLoss, steps: tSteps, divergence: tDivergence, setDistribution: setTrainerDistribution, setBatchSize } = trainer

  // sync trainer metrics into local state arrays for UI components
  useEffect(() => { setGenLoss(tGenLoss) }, [tGenLoss])
  useEffect(() => { setDisLoss(tDisLoss) }, [tDisLoss])
  useEffect(() => { setSteps(tSteps) }, [tSteps])
  useEffect(() => { setDivergence(tDivergence) }, [tDivergence])

  

  return (
    <div className="space-y-4">
      <TopControls running={trainerRunning} onToggle={() => { trainerRunning ? stop() : start() }} onStep={async () => await step()} onReset={() => { reset(); setGenLoss([]); setDisLoss([]); setSteps(0); setEpoch(0) }} epoch={epoch} distribution={distribution} setDistribution={(d) => { setDistribution(d); setTrainerDistribution(d) }} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bg-white p-4 rounded shadow">
          <GANGraph />
          <div className="mt-4">
            <DistributionView stateRef={stateRef} />
          </div>
        </div>

        <div className="lg:col-span-5 space-y-3">
          <LayeredDistributions stateRef={stateRef} distribution={distribution} steps={steps} onDivergence={(v: number) => setDivergence(v)} />
          <MetricsPanel genLoss={genLoss} disLoss={disLoss} divergence={divergence} />
          <NetworkViz latentDim={2} />
          <TrainingStatus steps={steps} timePerStep={timePerStep} />
        </div>
      </div>

      <Article />
    </div>
  )
}
