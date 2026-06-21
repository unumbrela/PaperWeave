"use client";

import { useEffect, useRef, useState } from "react";
import { framePath, getPrompt } from "@/lib/stable-diffusion-explainer/config";

const ACCENT = "#ec4899";
const SIZE = 256;

/**
 * 前向扩散演示：把一张清晰图按 DDPM 前向公式逐步加噪。
 *   x_t = √(1−ā)·x₀ + √(ā)·ε，  ā = 滑杆值 a ∈ [0,1]
 * 噪声场在图片加载时固定一次，拖动滑杆只改变混合比例，过渡平滑。
 */
export function ForwardNoise() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseRef = useRef<Float32Array | null>(null); // 原图，归一化 [-1,1]
  const noiseRef = useRef<Float32Array | null>(null); // 固定高斯噪声场
  const [a, setA] = useState(0);
  const [ready, setReady] = useState(false);

  // 取一张清晰成图作为 x₀
  const prompt = getPrompt("castle-artstation");
  const srcUrl = framePath(prompt.dir, 1, "7.0", 50);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const off = document.createElement("canvas");
      off.width = SIZE;
      off.height = SIZE;
      const octx = off.getContext("2d")!;
      octx.drawImage(img, 0, 0, SIZE, SIZE);
      const { data } = octx.getImageData(0, 0, SIZE, SIZE);
      const n = SIZE * SIZE * 4;
      const base = new Float32Array(n);
      const noise = new Float32Array(n);
      for (let i = 0; i < n; i += 4) {
        for (let c = 0; c < 3; c++) {
          base[i + c] = (data[i + c] / 255) * 2 - 1; // [-1,1]
          noise[i + c] = gaussian();
        }
        base[i + 3] = 1;
        noise[i + 3] = 1;
      }
      baseRef.current = base;
      noiseRef.current = noise;
      setReady(true);
    };
    img.src = srcUrl;
  }, [srcUrl]);

  // 重绘
  useEffect(() => {
    const canvas = canvasRef.current;
    const base = baseRef.current;
    const noise = noiseRef.current;
    if (!canvas || !base || !noise) return;
    const ctx = canvas.getContext("2d")!;
    const out = ctx.createImageData(SIZE, SIZE);
    const wx = Math.sqrt(1 - a);
    const wn = Math.sqrt(a);
    for (let i = 0; i < out.data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const v = wx * base[i + c] + wn * noise[i + c]; // [-1,1] 混合
        out.data[i + c] = Math.max(0, Math.min(255, ((v + 1) / 2) * 255));
      }
      out.data[i + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
  }, [a, ready]);

  return (
    <section className="rise surface rounded-2xl p-6" style={{ animationDelay: "280ms" }}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="serif text-[26px] text-ink">
          前向扩散 · <span className="serif-italic">把图片一步步「弄脏」</span>
        </h2>
        <span className="overline" style={{ color: ACCENT }}>
          交互 03
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink-2">
        训练扩散模型的第一步，是反过来——往清晰图里不断掺入高斯噪声，直到它变成纯噪声。
        模型要学的，就是这个过程的「逆操作」。拖动滑杆，亲手把它弄脏。
      </p>

      <div className="mt-6 flex flex-col items-center gap-4">
        <div className="overflow-hidden rounded-xl border border-line bg-paper-3">
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            className="block h-[256px] w-[256px]"
          />
        </div>
        <div className="w-full max-w-md">
          <div className="flex justify-between text-[11px] text-ink-3">
            <span>清晰原图 x₀</span>
            <span>纯噪声 x_T</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={a}
            onChange={(e) => setA(Number(e.target.value))}
            className="mt-1 w-full"
            style={{ accentColor: ACCENT }}
          />
          <p className="mt-1 text-center text-[12px] text-ink-2">
            加噪比例 ā ={" "}
            <span className="mono" style={{ color: ACCENT }}>{a.toFixed(2)}</span>
            <span className="text-ink-3">　·　x_t = √(1−ā)·x₀ + √ā·ε</span>
          </p>
        </div>
      </div>
    </section>
  );
}

/** Box–Muller 标准正态采样 */
function gaussian(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
