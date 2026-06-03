import React from 'react'

export type Distribution = 'gaussian' | 'ring' | 'moons'

export function DistributionSelector({ value, onChange }: { value: Distribution; onChange: (d: Distribution) => void }) {
  return (
    <div className="bg-white p-3 rounded shadow">
      <label className="block font-medium">数据分布</label>
      <div className="mt-2 space-y-2">
        <label className="flex items-center space-x-2">
          <input type="radio" name="dist" checked={value === 'gaussian'} onChange={() => onChange('gaussian')} />
          <span className="text-sm">高斯 (中心)</span>
        </label>
        <label className="flex items-center space-x-2">
          <input type="radio" name="dist" checked={value === 'ring'} onChange={() => onChange('ring')} />
          <span className="text-sm">环形</span>
        </label>
        <label className="flex items-center space-x-2">
          <input type="radio" name="dist" checked={value === 'moons'} onChange={() => onChange('moons')} />
          <span className="text-sm">双月（moons）</span>
        </label>
      </div>
    </div>
  )
}
