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

    const maxLen = Math.max(genLoss.length, disLoss.length, 1)
    const all = genLoss.concat(disLoss)
    const maxVal = Math.max(...all, 1)

    function drawLine(arr: number[], color: string) {
      ctx.beginPath()
      arr.forEach((v, i) => {
        const x = (i / Math.max(1, maxLen - 1)) * w
        const y = h - (v / maxVal) * h
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.stroke()
    }

    if (disLoss.length) drawLine(disLoss, 'rgba(59,130,246,0.9)')
    if (genLoss.length) drawLine(genLoss, 'rgba(16,185,129,0.9)')
  }, [genLoss, disLoss])

  return (
    <div className="bg-white p-3 rounded shadow">
      <div className="flex items-baseline justify-between">
        <span className="font-medium">损失曲线</span>
      </div>
      <canvas ref={ref} width={320} height={120} className="mt-2 w-full" />
      <div className="text-xs text-gray-500 mt-1">蓝色: 判别器, 绿色: 生成器</div>
    </div>
  )
}
