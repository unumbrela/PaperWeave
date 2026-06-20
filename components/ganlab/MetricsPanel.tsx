"use client"
import React from 'react'
import { LossChart } from './LossChart'

export function MetricsPanel({
  genLoss,
  disLoss,
  divergence,
}: {
  genLoss: number[]
  disLoss: number[]
  divergence: number
}) {
  const last = (a: number[]) => (a.length ? a[a.length - 1] : 0)
  return (
    <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-stone-700">训练指标</span>
        <span className="text-xs text-stone-500">JS 散度越小越收敛</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded bg-stone-50 p-2">
          <div className="text-[10px] text-stone-400">判别器损失</div>
          <div className="font-mono text-sm text-violet-700">{last(disLoss).toFixed(3)}</div>
        </div>
        <div className="rounded bg-stone-50 p-2">
          <div className="text-[10px] text-stone-400">生成器损失</div>
          <div className="font-mono text-sm text-emerald-600">{last(genLoss).toFixed(3)}</div>
        </div>
        <div className="rounded bg-stone-50 p-2">
          <div className="text-[10px] text-stone-400">JS 散度</div>
          <div className="font-mono text-sm text-stone-700">{divergence.toFixed(3)}</div>
        </div>
      </div>

      <LossChart genLoss={genLoss} disLoss={disLoss} />
      <div className="text-xs text-stone-400">
        <span className="text-violet-600">紫线</span> 判别器 ·{' '}
        <span className="text-emerald-600">绿线</span> 生成器
      </div>
    </div>
  )
}
