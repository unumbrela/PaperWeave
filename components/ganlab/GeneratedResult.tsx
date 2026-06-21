"use client"
import React from 'react'
import type { VizState } from '@/hooks/useGANTraining'
import { TARGET_IMAGES } from '@/lib/sampler'
import { PixelImage } from './PixelImage'

/** 展示「选定目标 → 当前最佳生成图」的对比，随训练逐步逼近目标。 */
export function GeneratedResult({
  stateRef,
  vizVersion,
  reached,
  targetIndex,
}: {
  stateRef: React.MutableRefObject<VizState>
  vizVersion: number
  reached: boolean
  targetIndex: number
}) {
  const { bestImage, targetName } = stateRef.current
  const target = TARGET_IMAGES[targetIndex]
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-6">
      <h3 className="mb-4 text-center text-sm font-semibold text-stone-700">生成结果</h3>
      <div className="flex items-end justify-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <PixelImage pixels={target.pixels} size={150} />
          <span className="text-xs text-stone-500">目标「{target.name}」</span>
        </div>
        <div className="self-center text-2xl text-stone-300">→</div>
        <div className="flex flex-col items-center gap-2">
          <PixelImage pixels={bestImage} size={150} version={vizVersion} className="shadow-sm" />
          <span className="text-xs text-stone-500">生成图</span>
        </div>
      </div>
      <div className="mt-4 text-center">
        {reached ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
            ✓ 已收敛到「{targetName || target.name}」
          </span>
        ) : (
          <p className="text-xs text-stone-400">
            点「开始训练」，生成图会从噪点逐步逼近左侧目标。
          </p>
        )}
      </div>
    </div>
  )
}
