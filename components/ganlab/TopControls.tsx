"use client"
import React from 'react'
import type { LossType } from '@/lib/ganModel'

export function TopControls({
  running,
  ready,
  onToggle,
  onStep,
  onReset,
  steps,
  lr,
  setLr,
  batch,
  setBatch,
  lossType,
  setLossType,
  slowMo,
  setSlowMo,
}: {
  running: boolean
  ready: boolean
  onToggle: () => void
  onStep: () => void
  onReset: () => void
  steps: number
  lr: number
  setLr: (v: number) => void
  batch: number
  setBatch: (v: number) => void
  lossType: LossType
  setLossType: (t: LossType) => void
  slowMo: boolean
  setSlowMo: (v: boolean) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-stone-200 bg-white p-3">
      <div className="text-lg font-semibold text-stone-800">GAN Lab</div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          disabled={!ready}
          className="rounded-md bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40"
        >
          {running ? '⏸ 暂停' : '▶ 开始'}
        </button>
        <button
          onClick={onStep}
          disabled={!ready || running}
          className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50 disabled:opacity-40"
        >
          单步
        </button>
        <button
          onClick={onReset}
          disabled={!ready}
          className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50 disabled:opacity-40"
        >
          重置
        </button>
        <label className="flex items-center gap-1.5 text-sm text-stone-600">
          <input type="checkbox" checked={slowMo} onChange={(e) => setSlowMo(e.target.checked)} />
          慢放
        </label>
      </div>

      <div className="flex items-center gap-2 text-sm text-stone-600">
        <span>学习率</span>
        <select
          value={lr}
          onChange={(e) => setLr(Number(e.target.value))}
          className="rounded border border-stone-300 p-1"
        >
          {[0.001, 0.005, 0.01, 0.02, 0.05, 0.1].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 text-sm text-stone-600">
        <span>批大小</span>
        <select
          value={batch}
          onChange={(e) => setBatch(Number(e.target.value))}
          className="rounded border border-stone-300 p-1"
        >
          {[16, 32, 64, 128].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 text-sm text-stone-600">
        <span>损失</span>
        <select
          value={lossType}
          onChange={(e) => setLossType(e.target.value as LossType)}
          className="rounded border border-stone-300 p-1"
        >
          <option value="log">Log loss</option>
          <option value="leastSq">LSGAN</option>
        </select>
      </div>

      <div className="ml-auto flex items-center gap-2 text-sm text-stone-500">
        <span>迭代</span>
        <span className="font-mono text-stone-800">{String(steps).padStart(6, '0')}</span>
      </div>
    </div>
  )
}
