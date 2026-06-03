"use client"
import React, { useEffect, useRef } from 'react'

export function DistributionView({ stateRef }: { stateRef: any }) {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    let raf = 0
    function draw() {
      const s = stateRef.current
      if (!s || !s.tf) { raf = requestAnimationFrame(draw); return }
      const tf = s.tf
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

      // draw real samples
      tf.tidy(() => {
        const real = s.distribution ? s.tf.randomNormal([256, 2], 0.5, 0.12) : s.tf.randomNormal([256, 2])
        const arr = real.arraySync() as number[][]
        ctx.fillStyle = 'rgba(59,130,246,0.9)'
        arr.forEach(p => ctx.fillRect(p[0] * ctx.canvas.width, p[1] * ctx.canvas.height, 2, 2))
      })

      // generator samples
      if (s && s.gen) {
        const z = s.tf.randomNormal([256, 2])
        const out = s.gen.predict(z) as any
        const a = out.arraySync() as number[][]
        ctx.fillStyle = 'rgba(249,115,22,0.9)'
        a.forEach(p => ctx.fillRect(p[0] * ctx.canvas.width, p[1] * ctx.canvas.height, 2, 2))
        s.tf.dispose([z, out])
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [stateRef])

  return <canvas ref={ref} width={480} height={360} className="border w-full" />
}
