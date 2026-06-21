"use client"
import React, { useEffect, useRef } from 'react'
import { IMG_DIM, IMG_SIZE } from '@/lib/sampler'

/** 把一张 IMG_SIZE×IMG_SIZE RGB 图（[0,1]，行优先 RGB）放大渲染到 canvas。 */
export function PixelImage({
  pixels,
  size = 64,
  version,
  className = '',
}: {
  pixels?: ArrayLike<number>
  size?: number
  version?: number
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, size, size)
    if (!pixels || pixels.length < IMG_DIM) {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, size, size)
      return
    }
    const off = document.createElement('canvas')
    off.width = IMG_SIZE
    off.height = IMG_SIZE
    const octx = off.getContext('2d')!
    const img = octx.createImageData(IMG_SIZE, IMG_SIZE)
    const clamp = (x: number) => Math.round(Math.min(1, Math.max(0, x)) * 255)
    for (let i = 0; i < IMG_SIZE * IMG_SIZE; i++) {
      img.data[i * 4] = clamp(pixels[i * 3])
      img.data[i * 4 + 1] = clamp(pixels[i * 3 + 1])
      img.data[i * 4 + 2] = clamp(pixels[i * 3 + 2])
      img.data[i * 4 + 3] = 255
    }
    octx.putImageData(img, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(off, 0, 0, size, size)
  }, [pixels, size, version])
  return <canvas ref={ref} width={size} height={size} className={`rounded bg-black ${className}`} />
}
