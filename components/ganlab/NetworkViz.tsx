import React from 'react'

export function NetworkViz({ latentDim = 2 }: { latentDim?: number }) {
  return (
    <div className="bg-white p-3 rounded shadow">
      <h4 className="font-medium">网络架构</h4>
      <div className="mt-3 text-sm text-gray-600">
        <div>生成器: `z({latentDim})` → Dense(16,tanh) → Dense(2)</div>
        <div className="mt-2">判别器: `x(2)` → Dense(16,relu) → Dense(1,sigmoid)</div>
      </div>
      <div className="mt-3 h-24 flex items-center justify-center text-xs text-gray-500">可视化为简化框图</div>
    </div>
  )
}
