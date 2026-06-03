import React, { useEffect, useRef } from 'react'

export function LayeredDistributions({ stateRef, distribution, steps, onDivergence }: any) {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const w = canvas.width
    const h = canvas.height

    const s = stateRef.current
    if (!s || !s.tf) return
    const tf = s.tf
    const gen = s.gen
    const dis = s.dis

    // compute classifier map
    const gridSize = 64
    const img = ctx.createImageData(gridSize, gridSize)
    const coords: number[][] = []
    for (let y = 0; y < gridSize; y++) for (let x = 0; x < gridSize; x++) coords.push([x / (gridSize - 1), y / (gridSize - 1)]);

    (async () => {
      const pts = tf.tensor2d(coords)
      const preds = dis.predict(pts) as any
      const probs = await preds.data()

      // fill heatmap (purple = fake, green = real)
      for (let i = 0; i < probs.length; i++) {
        const p = probs[i]
        const x = i % gridSize
        const y = Math.floor(i / gridSize)
        // purple-green mix
        const gp = Math.floor((1 - p) * 255)
        const rp = Math.floor(p * 200)
        const idx = (y * gridSize + x) * 4
        img.data[idx + 0] = Math.min(255, rp + 80)
        img.data[idx + 1] = gp
        img.data[idx + 2] = Math.floor((p) * 255)
        img.data[idx + 3] = 230
      }

      // draw scaled up
      const tmp = document.createElement('canvas')
      tmp.width = gridSize
      tmp.height = gridSize
      tmp.getContext('2d')!.putImageData(img, 0, 0)
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(tmp, 0, 0, w, h)

      // overlay samples
      const real = (() => {
        switch (distribution) {
          case 'gaussian': return tf.add(tf.randomNormal([256, 2], 0.5, 0.12), 0)
          case 'ring': {
            const r = tf.add(tf.randomNormal([256, 1], 0.4, 0.05).abs(), 0)
            const theta = tf.randomUniform([256, 1], 0, Math.PI * 2)
            const x = tf.mul(r, tf.cos(theta))
            const y = tf.mul(r, tf.sin(theta))
            return tf.concat([x.add(0.5), y.add(0.5)], 1)
          }
          case 'moons': {
            const half = 128
            const a = tf.add(tf.randomNormal([half, 2], 0.35, 0.08), tf.tensor([0.25, 0.5]))
            const b = tf.add(tf.randomNormal([256 - half, 2], 0.75, 0.08), tf.tensor([0.0, -0.1]))
            return tf.concat([a, b], 0)
          }
        }
      })()

      const realArr = await real.array()
      ctx.fillStyle = 'rgba(16,185,129,0.9)'
      realArr.forEach((p: number[]) => ctx.fillRect(p[0] * w, p[1] * h, 2, 2))

      // fake samples from generator
      let fakeArr: number[][] = []
      if (gen) {
        const z = tf.randomNormal([256, 2])
        const gOut = gen.predict(z) as any
        fakeArr = await gOut.array()
        ctx.fillStyle = 'rgba(99,102,241,0.9)'
        fakeArr.forEach((p: number[]) => ctx.fillRect(p[0] * w, p[1] * h, 2, 2))
        tf.dispose([z, gOut])
      }

      // compute simple JS divergence on grid
      const realHist = new Float32Array(gridSize * gridSize).fill(0)
      const fakeHist = new Float32Array(gridSize * gridSize).fill(0)
      realArr.forEach((p: number[]) => { const xi = Math.floor(p[0] * (gridSize - 1)); const yi = Math.floor(p[1] * (gridSize - 1)); realHist[yi * gridSize + xi] += 1 })
      fakeArr.forEach((p: number[]) => { const xi = Math.floor(p[0] * (gridSize - 1)); const yi = Math.floor(p[1] * (gridSize - 1)); fakeHist[yi * gridSize + xi] += 1 })
      const normalize = (arr: Float32Array) => { const s = arr.reduce((a, b) => a + b, 0) || 1; for (let i = 0; i < arr.length; i++) arr[i] /= s }
      normalize(realHist); normalize(fakeHist)
      const m = new Float32Array(realHist.length)
      for (let i = 0; i < m.length; i++) m[i] = 0.5 * (realHist[i] + fakeHist[i])
      function kl(a: Float32Array, b: Float32Array) { let s = 0; for (let i = 0; i < a.length; i++) if (a[i] > 0) s += a[i] * Math.log(a[i] / (b[i] + 1e-12) + 1e-12); return s }
      const js = 0.5 * (kl(realHist, m) + kl(fakeHist, m))

      onDivergence && onDivergence(js)

      tf.dispose([pts, preds, real])
    })()
  }, [stateRef, distribution, steps])

  return (
    <div className="bg-white p-3 rounded shadow">
      <h4 className="font-medium">Layered Distributions</h4>
      <canvas ref={ref} width={320} height={320} className="mt-2 w-full border" />
      <div className="text-xs text-gray-500 mt-2">绿色: 真实样本, 蓝色: 生成样本。背景颜色为判别器判别置信度。</div>
    </div>
  )
}
