"use client"
import React from 'react'
import { LossChart } from './LossChart'

export function MetricsPanel({
  genLoss,
  disLoss,
  convergence,
  reached,
}: {
  genLoss: number[]
  disLoss: number[]
  convergence: number
  reached: boolean
}) {
  const pct = Math.round(convergence * 100)
  return (
    <div className="space-y-4 rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-stone-700">收敛进度</span>
        {reached ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            ✓ 已达到目标
          </span>
        ) : (
          <span className="text-xs text-stone-400">训练中…</span>
        )}
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-xs text-stone-500">生成图与目标的接近度</span>
          <span className="font-mono text-sm text-stone-800">{pct}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              reached ? 'bg-emerald-500' : 'bg-violet-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs text-stone-500">损失曲线</div>
        <LossChart genLoss={genLoss} disLoss={disLoss} />
        <div className="mt-1 text-xs text-stone-400">
          <span className="text-violet-600">紫线</span> 判别器 ·{' '}
          <span className="text-emerald-600">绿线</span> 生成器
        </div>
      </div>
    </div>
  )
}
