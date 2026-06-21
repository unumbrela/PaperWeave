"use client"
import React from 'react'
import type { VizState } from '@/hooks/useGANTraining'
import { PixelImage } from './PixelImage'

/** 4×4 生成网格：固定隐变量种子下，生成器输出随训练逐步清晰。 */
export function GeneratedGrid({
  stateRef,
  vizVersion,
}: {
  stateRef: React.MutableRefObject<VizState>
  vizVersion: number
}) {
  const images = stateRef.current.displayImages
  const cells = Array.from({ length: 16 }, (_, i) => images[i])
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <h3 className="mb-3 text-center text-sm font-semibold text-stone-700">生成结果（固定噪声种子）</h3>
      <div className="mx-auto grid w-fit grid-cols-4 gap-1.5">
        {cells.map((px, i) => (
          <PixelImage key={i} pixels={px} size={72} version={vizVersion} />
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-stone-400">
        每格对应一个固定噪声向量；点开始后，生成器会让它们逐步逼近目标图。
      </p>
    </div>
  )
}
