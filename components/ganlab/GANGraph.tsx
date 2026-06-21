"use client"
import React, { useEffect, useRef } from 'react'
import type { VizState } from '@/hooks/useGANTraining'
import { TARGET_IMAGES } from '@/lib/sampler'
import { PixelImage } from './PixelImage'

function NoiseThumb({ size = 64 }: { size?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const n = 8
    const cell = size / n
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const v = Math.round(Math.random() * 255)
        ctx.fillStyle = `rgb(${v},${v},${v})`
        ctx.fillRect(x * cell, y * cell, cell + 1, cell + 1)
      }
  }, [size])
  return <canvas ref={ref} width={size} height={size} className="rounded bg-black" />
}

function Node({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {children}
      <div className="text-center">
        <div className="text-xs font-medium text-stone-700">{title}</div>
        {sub && <div className="text-[10px] text-stone-400">{sub}</div>}
      </div>
    </div>
  )
}

const Arrow = () => <div className="self-start mt-7 px-1 text-xl text-stone-300">→</div>

export function GANGraph({
  stateRef,
  vizVersion,
}: {
  stateRef: React.MutableRefObject<VizState>
  vizVersion: number
}) {
  const sample = stateRef.current.bestImage
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <h3 className="mb-3 text-center text-sm font-semibold text-stone-700">模型总览</h3>
      <div className="flex flex-wrap items-start justify-center gap-1">
        <Node title="随机噪声 z" sub="隐变量向量">
          <NoiseThumb size={64} />
        </Node>
        <Arrow />
        <Node title="生成器 G" sub="生成假图像">
          <PixelImage pixels={sample} size={64} version={vizVersion} />
        </Node>
        <Arrow />
        <Node title="判别器 D" sub="判断真 / 假">
          <div className="flex h-16 w-16 items-center justify-center rounded border border-stone-200 bg-stone-50 text-2xl">
            ⚖️
          </div>
        </Node>
        <Arrow />
        <Node title="真实图像" sub="目标分布">
          <PixelImage pixels={TARGET_IMAGES[0].pixels} size={64} />
        </Node>
      </div>
    </div>
  )
}
