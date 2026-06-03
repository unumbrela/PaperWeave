import React from 'react'

export function TrainingStatus({ steps, timePerStep }: { steps: number; timePerStep: number }) {
  return (
    <div className="bg-white p-3 rounded shadow">
      <h4 className="font-medium">训练状态</h4>
      <div className="mt-2 text-sm text-gray-700">步骤: {steps}</div>
      <div className="text-sm text-gray-700">平均每步耗时: {timePerStep.toFixed(1)} ms</div>
    </div>
  )
}
