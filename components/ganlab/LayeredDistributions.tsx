"use client"
import React, { useEffect, useRef } from 'react'
import type { VizState } from '@/hooks/useGANTraining'

export interface LayerToggles {
  heatmap: boolean
  manifold: boolean
  real: boolean
  fake: boolean
  gradients: boolean
}

// 数据坐标 [0,1] → 画布像素（y 轴朝上，原点左下，与 GAN Lab 一致）
const toPx = (x: number, y: number, w: number, h: number): [number, number] => [x * w, (1 - y) * h]

function drawHeatmap(ctx: CanvasRenderingContext2D, s: VizState, w: number, h: number) {
  if (!s.heatmap) return
  const res = s.heatmapRes
  const cw = w / res
  const ch = h / res
  for (let row = 0; row < res; ++row) {
    for (let col = 0; col < res; ++col) {
      const p = s.heatmap[row * res + col]
      // 绿色=判为真, 紫色=判为假, 0.5 处接近透明
      let r: number, g: number, b: number, a: number
      if (p >= 0.5) {
        r = 16; g = 185; b = 129; a = (p - 0.5) * 2 * 0.55
      } else {
        r = 124; g = 58; b = 237; a = (0.5 - p) * 2 * 0.55
      }
      ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`
      const px = col * cw
      const py = (res - 1 - row) * ch
      ctx.fillRect(px, py, cw + 1, ch + 1)
    }
  }
}

function drawManifold(ctx: CanvasRenderingContext2D, s: VizState, w: number, h: number) {
  const verts = s.manifoldVertices
  const cells = s.manifoldCells
  const side = cells + 1
  if (verts.length < side * side) return
  const idx = (i: number, j: number) => i * side + j
  ctx.lineWidth = 0.5
  ctx.strokeStyle = 'rgba(245,158,11,0.35)'
  for (let i = 0; i < cells; ++i) {
    for (let j = 0; j < cells; ++j) {
      const a = verts[idx(i, j)]
      const b = verts[idx(i + 1, j)]
      const c = verts[idx(i + 1, j + 1)]
      const d = verts[idx(i, j + 1)]
      const pa = toPx(a[0], a[1], w, h)
      const pb = toPx(b[0], b[1], w, h)
      const pc = toPx(c[0], c[1], w, h)
      const pd = toPx(d[0], d[1], w, h)
      // 四边形面积（shoelace），面积越小密度越高 → 越不透明
      const area =
        0.5 *
        Math.abs(
          pa[0] * pb[1] - pb[0] * pa[1] +
            pb[0] * pc[1] - pc[0] * pb[1] +
            pc[0] * pd[1] - pd[0] * pc[1] +
            pd[0] * pa[1] - pa[0] * pd[1],
        )
      const baseArea = (w / cells) * (h / cells)
      const opacity = Math.min(0.6, (baseArea / (area + 1)) * 0.25)
      ctx.fillStyle = `rgba(249,115,22,${opacity.toFixed(3)})`
      ctx.beginPath()
      ctx.moveTo(pa[0], pa[1])
      ctx.lineTo(pb[0], pb[1])
      ctx.lineTo(pc[0], pc[1])
      ctx.lineTo(pd[0], pd[1])
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
  }
}

function drawPoints(
  ctx: CanvasRenderingContext2D,
  pts: number[][],
  w: number,
  h: number,
  color: string,
) {
  ctx.fillStyle = color
  for (const p of pts) {
    const [px, py] = toPx(p[0], p[1], w, h)
    ctx.beginPath()
    ctx.arc(px, py, 2, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawGradients(ctx: CanvasRenderingContext2D, s: VizState, w: number, h: number) {
  const pts = s.gradSamples
  const vec = s.gradVectors
  if (!pts.length || pts.length !== vec.length) return
  ctx.strokeStyle = 'rgba(236,72,153,0.9)'
  ctx.lineWidth = 1
  const scale = 0.15 // 显示用缩放
  for (let i = 0; i < pts.length; ++i) {
    const [x, y] = pts[i]
    const dx = vec[i][0] * scale
    const dy = vec[i][1] * scale
    const [px, py] = toPx(x, y, w, h)
    const [qx, qy] = toPx(x + dx, y + dy, w, h)
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.lineTo(qx, qy)
    ctx.stroke()
  }
}

export function LayeredDistributions({
  stateRef,
  vizVersion,
  layers,
}: {
  stateRef: React.MutableRefObject<VizState>
  vizVersion: number
  layers: LayerToggles
}) {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const w = canvas.width
    const h = canvas.height
    const s = stateRef.current
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#fafaf9'
    ctx.fillRect(0, 0, w, h)

    if (layers.heatmap) drawHeatmap(ctx, s, w, h)
    if (layers.manifold) drawManifold(ctx, s, w, h)
    if (layers.real) drawPoints(ctx, s.realSamples, w, h, 'rgba(16,185,129,0.85)')
    if (layers.fake) drawPoints(ctx, s.fakeSamples, w, h, 'rgba(124,58,237,0.85)')
    if (layers.gradients) drawGradients(ctx, s, w, h)
  }, [stateRef, vizVersion, layers])

  return <canvas ref={ref} width={420} height={420} className="w-full rounded border border-stone-200" />
}
