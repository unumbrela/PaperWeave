"use client"
import React from 'react'
import { TARGET_IMAGES } from '@/lib/sampler'
import { PixelImage } from './PixelImage'

/** 选择要生成的目标图：点击某张即设为目标并开始向它收敛。 */
export function TargetSelector({
  targetIndex,
  onSelect,
}: {
  targetIndex: number
  onSelect: (idx: number) => void
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <h3 className="mb-1 text-center text-sm font-semibold text-stone-700">选择目标图像</h3>
      <p className="mb-3 text-center text-xs text-stone-400">点击任意一张，生成器会向它收敛</p>
      <div className="mx-auto grid w-fit grid-cols-3 gap-2">
        {TARGET_IMAGES.map((t, i) => {
          const selected = i === targetIndex
          return (
            <button
              key={t.name}
              onClick={() => onSelect(i)}
              className={`flex flex-col items-center gap-1 rounded-md border p-1.5 transition ${
                selected
                  ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-300'
                  : 'border-stone-200 hover:bg-stone-50'
              }`}
            >
              <PixelImage pixels={t.pixels} size={56} />
              <span className={`text-xs ${selected ? 'font-medium text-violet-700' : 'text-stone-500'}`}>
                {t.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
