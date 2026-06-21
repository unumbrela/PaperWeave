"use client"
import React from 'react'
import { TARGET_IMAGES } from '@/lib/sampler'
import { PixelImage } from './PixelImage'

/** 固定目标图：生成器要学会复刻的一小组图像。 */
export function TargetGrid() {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <h3 className="mb-3 text-center text-sm font-semibold text-stone-700">目标图像</h3>
      <div className="mx-auto grid w-fit grid-cols-3 gap-2">
        {TARGET_IMAGES.map((t) => (
          <div key={t.name} className="flex flex-col items-center gap-1">
            <PixelImage pixels={t.pixels} size={64} />
            <span className="text-xs text-stone-500">{t.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
