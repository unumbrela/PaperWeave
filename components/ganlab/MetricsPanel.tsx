import React from 'react'
import { LossChart } from './LossChart'

export function MetricsPanel({ genLoss, disLoss, divergence }: { genLoss: number[]; disLoss: number[]; divergence: number }) {
  return (
    <div className="bg-white p-3 rounded shadow space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">Metrics</span>
        <span className="text-sm text-gray-600">JS Divergence: {divergence.toFixed(3)}</span>
      </div>
      <LossChart genLoss={genLoss} disLoss={disLoss} />
      <div className="grid grid-cols-1 gap-2">
        <div className="text-xs text-gray-500">辅助指标（占位）</div>
        <div className="h-12 bg-gray-50 rounded flex items-center justify-center text-sm text-gray-400">KL / JS 小图表</div>
      </div>
    </div>
  )
}
