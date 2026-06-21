"use client"
import React from 'react'
import type { VizState } from '@/hooks/useGANTraining'
import { PixelImage } from './PixelImage'

/** 只展示当前最佳的一张生成图（最接近某个目标），随训练逐步清晰。 */
export function GeneratedResult({
  stateRef,
  vizVersion,
  reached,
}: {
  stateRef: React.MutableRefObject<VizState>
  vizVersion: number
  reached: boolean
}) {
  const { bestImage, bestTargetName } = stateRef.current
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-6">
      <h3 className="mb-4 text-center text-sm font-semibold text-stone-700">生成结果</h3>
      <div className="flex flex-col items-center gap-3">
        <PixelImage pixels={bestImage} size={224} version={vizVersion} className="shadow-sm" />
        {reached ? (
          <div className="text-center">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
              ✓ 已收敛 · 匹配「{bestTargetName || '—'}」
            </span>
          </div>
        ) : (
          <p className="text-center text-xs text-stone-400">
            点「开始训练」，生成器会从噪点逐步收敛到一张清晰的目标图。
          </p>
        )}
      </div>
    </div>
  )
}
