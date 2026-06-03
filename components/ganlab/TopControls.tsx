import React from 'react'
import { Distribution } from './DistributionSelector'

export function TopControls({
  running,
  onToggle,
  onStep,
  onReset,
  epoch,
  distribution,
  setDistribution
}: {
  running: boolean
  onToggle: () => void
  onStep: () => void
  onReset: () => void
  epoch: number
  distribution: Distribution
  setDistribution: (d: Distribution) => void
}) {
  return (
    <div className="flex items-center justify-between bg-white p-3 rounded shadow">
      <div className="flex items-center space-x-4">
        <div className="text-lg font-semibold">GAN Lab</div>
        <div className="flex items-center space-x-2">
          <button onClick={onToggle} className="p-2 rounded bg-sky-600 text-white">{running ? '暂停' : '开始'}</button>
          <button onClick={onStep} className="p-2 rounded border">单步</button>
          <button onClick={onReset} className="p-2 rounded border">重置</button>
        </div>
      </div>
      <div className="flex items-center space-x-6">
        <div className="text-sm text-gray-600">Epoch</div>
        <div className="font-mono">{String(epoch).padStart(6, '0')}</div>
        <div className="flex items-center space-x-2">
          <select value={distribution} onChange={e => setDistribution(e.target.value as Distribution)} className="border rounded p-1 text-sm">
            <option value="gaussian">Gaussian</option>
            <option value="ring">Ring</option>
            <option value="moons">Moons</option>
          </select>
        </div>
      </div>
    </div>
  )
}
