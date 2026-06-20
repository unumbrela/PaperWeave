"use client"
import React from 'react'
import { Distribution, DrawingPositions, PRESET_DISTRIBUTIONS } from '@/lib/sampler'
import { DrawDistribution } from './DrawDistribution'

export type { Distribution }

export function DistributionSelector({
  value,
  onChange,
  onDrawingChange,
}: {
  value: Distribution
  onChange: (d: Distribution) => void
  onDrawingChange: (positions: DrawingPositions) => void
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <label className="block text-sm font-semibold text-stone-700">目标数据分布</label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {PRESET_DISTRIBUTIONS.map((d) => (
          <button
            key={d.id}
            onClick={() => onChange(d.id)}
            className={`rounded-md border px-3 py-2 text-sm transition ${
              value === d.id
                ? 'border-violet-400 bg-violet-50 text-violet-700'
                : 'border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            {d.label}
          </button>
        ))}
        <button
          onClick={() => onChange('drawing')}
          className={`col-span-2 rounded-md border px-3 py-2 text-sm transition ${
            value === 'drawing'
              ? 'border-violet-400 bg-violet-50 text-violet-700'
              : 'border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          ✎ 自绘分布
        </button>
      </div>
      {value === 'drawing' && (
        <div className="mt-3">
          <p className="mb-2 text-xs text-stone-500">在下方画布上涂抹，定义你自己的目标分布。</p>
          <DrawDistribution onChange={onDrawingChange} />
        </div>
      )}
    </div>
  )
}
