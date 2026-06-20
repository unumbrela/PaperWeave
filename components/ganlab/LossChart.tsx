"use client"
import React, { useEffect, useRef } from 'react'

export function LossChart({ genLoss, disLoss }: { genLoss: number[]; disLoss: number[] }) {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#fafaf9'
    ctx.fillRect(0, 0, w, h)

    const maxLen = Math.max(genLoss.length, disLoss.length, 1)
    const maxVal = Math.max(...genLoss, ...disLoss, 0.1)

    const drawLine = (arr: number[], color: string) => {
      if (!arr.length) return
      ctx.beginPath()
      arr.forEach((v, i) => {
        const x = (i / Math.max(1, maxLen - 1)) * w
        const y = h - (v / maxVal) * (h - 4) - 2
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    drawLine(disLoss, 'rgba(124,58,237,0.9)')
    drawLine(genLoss, 'rgba(16,185,129,0.9)')
  }, [genLoss, disLoss])

  return <canvas ref={ref} width={320} height={110} className="mt-1 w-full" />
}
