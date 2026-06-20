"use client"
import React, { useEffect, useRef, useState } from 'react'
import type { DrawingPositions } from '@/lib/sampler'

/**
 * 在画布上涂抹，收集归一化到 [0,1]² 的点作为自定义目标分布。
 * 与 GAN Lab 的 "draw your own" 行为一致。
 */
export function DrawDistribution({
  onChange,
}: {
  onChange: (positions: DrawingPositions) => void
}) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const posRef = useRef<DrawingPositions>([])
  const [count, setCount] = useState(0)

  const redraw = () => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.fillStyle = '#fafaf9'
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.fillStyle = 'rgba(16,185,129,0.8)'
    for (const [x, y] of posRef.current) {
      ctx.beginPath()
      ctx.arc(x * c.width, (1 - y) * c.height, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  useEffect(redraw, [])

  const addAt = (clientX: number, clientY: number) => {
    const c = ref.current
    if (!c) return
    const rect = c.getBoundingClientRect()
    const x = (clientX - rect.left) / rect.width
    const y = 1 - (clientY - rect.top) / rect.height
    if (x < 0 || x > 1 || y < 0 || y > 1) return
    // 在落点周围撒几个点，涂抹更顺手
    for (let i = 0; i < 3; ++i) {
      posRef.current.push([
        Math.min(1, Math.max(0, x + (Math.random() - 0.5) * 0.03)),
        Math.min(1, Math.max(0, y + (Math.random() - 0.5) * 0.03)),
      ])
    }
    setCount(posRef.current.length)
    onChange([...posRef.current])
    redraw()
  }

  const clear = () => {
    posRef.current = []
    setCount(0)
    onChange([])
    redraw()
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={ref}
        width={240}
        height={240}
        className="w-full cursor-crosshair rounded border border-stone-200 touch-none"
        onPointerDown={(e) => {
          drawingRef.current = true
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
          addAt(e.clientX, e.clientY)
        }}
        onPointerMove={(e) => {
          if (drawingRef.current) addAt(e.clientX, e.clientY)
        }}
        onPointerUp={() => (drawingRef.current = false)}
      />
      <div className="flex items-center justify-between text-xs text-stone-500">
        <span>已绘制 {count} 个点</span>
        <button onClick={clear} className="rounded border border-stone-300 px-2 py-0.5 hover:bg-stone-50">
          清空
        </button>
      </div>
    </div>
  )
}
