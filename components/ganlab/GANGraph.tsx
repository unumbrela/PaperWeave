"use client"
import React, { useEffect, useRef } from 'react'
import type { VizState } from '@/hooks/useGANTraining'

const toPx = (x: number, y: number, w: number, h: number): [number, number] => [x * w, (1 - y) * h]

type Kind = 'noise' | 'fake' | 'real' | 'disc'

function Thumb({
  stateRef,
  vizVersion,
  kind,
  color,
}: {
  stateRef: React.MutableRefObject<VizState>
  vizVersion: number
  kind: Kind
  color?: string
}) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const w = c.width
    const h = c.height
    const s = stateRef.current
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#fafaf9'
    ctx.fillRect(0, 0, w, h)

    if (kind === 'disc' && s.heatmap) {
      const res = s.heatmapRes
      const cw = w / res
      const ch = h / res
      for (let row = 0; row < res; ++row)
        for (let col = 0; col < res; ++col) {
          const p = s.heatmap[row * res + col]
          const [r, g, b, a] =
            p >= 0.5 ? [16, 185, 129, (p - 0.5) * 1.6] : [124, 58, 237, (0.5 - p) * 1.6]
          ctx.fillStyle = `rgba(${r},${g},${b},${a})`
          ctx.fillRect(col * cw, (res - 1 - row) * ch, cw + 1, ch + 1)
        }
      return
    }

    let pts: number[][] = []
    if (kind === 'fake') pts = s.fakeSamples
    else if (kind === 'real') pts = s.realSamples
    else if (kind === 'noise')
      // 噪声为 [0,1]² 均匀分布，示意性地画一批均匀点
      pts = Array.from({ length: 120 }, () => [Math.random(), Math.random()])

    ctx.fillStyle = color || 'rgba(100,116,139,0.8)'
    for (const p of pts.slice(0, 200)) {
      const [px, py] = toPx(p[0], p[1], w, h)
      ctx.beginPath()
      ctx.arc(px, py, 1.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [stateRef, vizVersion, kind, color])
  return <canvas ref={ref} width={96} height={96} className="rounded border border-stone-200" />
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

const Arrow = () => <div className="self-start mt-9 px-1 text-xl text-stone-300">→</div>

export function GANGraph({
  stateRef,
  vizVersion,
}: {
  stateRef: React.MutableRefObject<VizState>
  vizVersion: number
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-stone-700">模型总览</h3>
      <div className="flex flex-wrap items-start gap-1 overflow-x-auto">
        <Node title="随机噪声 z" sub="均匀 [0,1]²">
          <Thumb stateRef={stateRef} vizVersion={vizVersion} kind="noise" color="rgba(148,163,184,0.8)" />
        </Node>
        <Arrow />
        <Node title="生成器 G" sub="生成假样本">
          <Thumb stateRef={stateRef} vizVersion={vizVersion} kind="fake" color="rgba(124,58,237,0.85)" />
        </Node>
        <Arrow />
        <Node title="判别器 D" sub="绿真 / 紫假">
          <Thumb stateRef={stateRef} vizVersion={vizVersion} kind="disc" />
        </Node>
        <Arrow />
        <Node title="真实样本" sub="目标分布">
          <Thumb stateRef={stateRef} vizVersion={vizVersion} kind="real" color="rgba(16,185,129,0.85)" />
        </Node>
      </div>
    </div>
  )
}
