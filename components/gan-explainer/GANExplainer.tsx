"use client";

import { useState, useEffect, useMemo } from "react";
import { Hero } from "./Hero";
import { Article } from "./Article";
import { Overview } from "./Overview";
import { LatentSelector } from "./LatentSelector";
import { LossChart } from "./LossChart";
import { GeneratedResult } from "./GeneratedResult";
import { constructGAN, generateTrainingStats } from "@/lib/gan-explainer/gan-model";
import type { GAN, ScaleLevel, TrainingStats } from "@/lib/gan-explainer/types";
import { exampleLatentVectors } from "@/lib/gan-explainer/config";

export function GANExplainer() {
  const [selectedLatentIndex, setSelectedLatentIndex] = useState(0);
  const [customNoise, setCustomNoise] = useState<number[] | null>(null);
  const [customLabel, setCustomLabel] = useState("");
  const [gan, setGan] = useState<GAN | null>(null);
  const [generatedDataUrl, setGeneratedDataUrl] = useState<string | null>(null);
  const [scaleLevel, setScaleLevel] = useState<ScaleLevel>("global");
  const [detailedMode, setDetailedMode] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<{ show: boolean; text: string }>({ show: false, text: "" });

  const trainingStats = useMemo<TrainingStats>(() => {
    return generateTrainingStats(50);
  }, []);

  useEffect(() => {
    const latentVector = customNoise || exampleLatentVectors[selectedLatentIndex].noise;
    const newGAN = constructGAN(latentVector);
    setGan(newGAN);
    // convert generated node's output into a PNG data URL for the result panel
    try {
      const genLayer = newGAN.find((layer) => layer[0]?.type === "generated-image");
      const out = genLayer?.[0]?.output as number[][] | undefined;
      if (out && out.length > 0) {
        const imageLength = out.length;
        const buf = document.createElement("canvas");
        const bctx = buf.getContext("2d")!;
        buf.width = imageLength;
        buf.height = imageLength;
        const imgData = bctx.createImageData(imageLength, imageLength);
        const flat = imgData.data;
        const maxVal = Math.max(...out.flat());
        const minVal = Math.min(...out.flat());
        const range = maxVal - minVal || 1;
        // lazy import color scale
         
        const { layerColorScales } = require("@/lib/gan-explainer/config");
        // use generator color scale
        const colorScale = layerColorScales.generator;
        // fill pixels
        for (let i = 0; i < flat.length; i += 4) {
          const pixelIndex = Math.floor(i / 4);
          const row = Math.floor(pixelIndex / imageLength);
          const col = pixelIndex % imageLength;
          const val = out[row]?.[col] ?? 0;
          const normalized = (val - minVal) / range;
          // d3 rgb parsing
           
          const { rgb } = require("d3");
          const color = rgb(colorScale(normalized));
          flat[i] = color.r;
          flat[i + 1] = color.g;
          flat[i + 2] = color.b;
          flat[i + 3] = 255;
        }
        bctx.putImageData(imgData, 0, 0);
        const large = document.createElement("canvas");
        const scale = 4; // upscale to 256 from 64
        large.width = imageLength * scale;
        large.height = imageLength * scale;
        const lctx = large.getContext("2d")!;
        lctx.imageSmoothingEnabled = false;
        lctx.drawImage(buf, 0, 0, imageLength, imageLength, 0, 0, large.width, large.height);
        const dataUrl = large.toDataURL("image/png");
        setGeneratedDataUrl(dataUrl);
      } else {
        setGeneratedDataUrl(null);
      }
    } catch (e) {
      // if any error, fall back to null
       
      console.warn("failed to build generatedDataUrl", e);
      setGeneratedDataUrl(null);
    }
  }, [selectedLatentIndex, customNoise]);

  const handleCustomChange = (noise: number[], label?: string) => {
    setCustomNoise(noise);
    setCustomLabel(label || "");
    setSelectedLatentIndex(-1);
  };

  const layerLabels = [
    "Noise",
    "Gen_1",
    "Gen_2",
    "Gen_3",
    "Generated",
    "Real",
    "Disc_1",
    "Disc_2",
    "Disc_3",
    "Output",
  ];

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 pt-10 pb-20">
      <Hero />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div
            className="rise surface rounded-2xl overflow-hidden border border-[var(--line)] p-6"
            style={{ animationDelay: "360ms" }}
          >
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <h3 className="serif text-lg text-ink">GAN 架构可视化</h3>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setScaleLevel("local")}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                      scaleLevel === "local"
                        ? "bg-[#22c55e] text-white"
                        : "bg-surface border border-[var(--line)] text-ink-2 hover:border-[#22c55e]"
                    }`}
                  >
                    Local
                  </button>
                  <button
                    onClick={() => setScaleLevel("module")}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                      scaleLevel === "module"
                        ? "bg-[#22c55e] text-white"
                        : "bg-surface border border-[var(--line)] text-ink-2 hover:border-[#22c55e]"
                    }`}
                  >
                    Module
                  </button>
                  <button
                    onClick={() => setScaleLevel("global")}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                      scaleLevel === "global"
                        ? "bg-[#22c55e] text-white"
                        : "bg-surface border border-[var(--line)] text-ink-2 hover:border-[#22c55e]"
                    }`}
                  >
                    Global
                  </button>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={detailedMode}
                    onChange={(e) => setDetailedMode(e.target.checked)}
                    className="sr-only"
                  />
                  <span className={`w-9 h-5 rounded-full transition-colors ${detailedMode ? "bg-[#22c55e]" : "bg-[var(--line)]"}`}>
                    <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${detailedMode ? "translate-x-4" : "translate-x-0.5"}`} />
                  </span>
                  <span className="text-xs text-ink-2">详细模式</span>
                </label>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-ink-3 mb-3">选择隐向量（生成目标）：</p>
              <LatentSelector
                options={[...exampleLatentVectors]}
                selectedIndex={selectedLatentIndex}
                onSelect={setSelectedLatentIndex}
                onCustomChange={handleCustomChange}
              />
              {customNoise && (
                <div className="mt-2 text-xs text-[#f4c25a]">
                  ✨ 已应用自定义隐向量，点击预设选项可切换回预设目标
                </div>
              )}
            </div>

            {hoverInfo.show && (
              <div className="mb-4 px-4 py-2 bg-[#22c55e]/10 rounded-lg text-sm text-ink">
                {hoverInfo.text}
              </div>
            )}

            <Overview
              gan={gan}
              scaleLevel={scaleLevel}
              detailedMode={detailedMode}
              onHoverInfo={setHoverInfo}
            />

            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {layerLabels.map((label, index) => (
                <span
                  key={index}
                  className={`px-3 py-1 rounded-full text-xs ${
                    label.includes("Noise")
                      ? "bg-gray-100 text-gray-700"
                      : label.includes("Gen_")
                      ? "bg-green-100 text-green-700"
                      : label.includes("Generated")
                      ? "bg-emerald-100 text-emerald-700"
                      : label.includes("Real")
                      ? "bg-red-100 text-red-700"
                      : label.includes("Disc_")
                      ? "bg-orange-100 text-orange-700"
                      : "bg-purple-100 text-purple-700"
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <GeneratedResult 
            label={customLabel || exampleLatentVectors[selectedLatentIndex]?.label || "人脸"} 
            quality={0.8}
            dataUrl={generatedDataUrl}
          />
          
          <div className="rise surface rounded-2xl overflow-hidden border border-[var(--line)] p-6">
            <h3 className="serif text-lg text-ink mb-4">训练损失曲线</h3>
            <LossChart stats={trainingStats} />
          </div>

          <div className="rise surface rounded-2xl overflow-hidden border border-[var(--line)] p-6">
            <h3 className="serif text-lg text-ink mb-4">架构说明</h3>
            <div className="space-y-3 text-xs text-ink-3">
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-500 mt-1.5" />
                <div>
                  <strong className="text-ink">噪声输入 (Noise)</strong>
                  <p>从正态分布中采样的随机向量，作为生成器的初始输入</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                <div>
                  <strong className="text-ink">生成器 (Generator)</strong>
                  <p>通过反卷积层将噪声向量逐步上采样为图像</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
                <div>
                  <strong className="text-ink">生成图像</strong>
                  <p>生成器的输出，试图欺骗判别器</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />
                <div>
                  <strong className="text-ink">真实图像</strong>
                  <p>来自训练数据集的真实样本</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 mt-1.5" />
                <div>
                  <strong className="text-ink">判别器 (Discriminator)</strong>
                  <p>试图区分真实图像和生成图像</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rise surface rounded-2xl overflow-hidden border border-[var(--line)] p-6">
            <h3 className="serif text-lg text-ink mb-4">博弈过程</h3>
            <div className="space-y-2 text-xs text-ink-3">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#22c55e]/5">
                <span>生成器目标</span>
                <span className="text-green-600">最大化欺骗判别器</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#ef4444]/5">
                <span>判别器目标</span>
                <span className="text-red-600">正确区分真假</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#f4c25a]/5">
                <span>纳什均衡</span>
                <span className="text-yellow-600">双方达到平衡</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Article />
    </div>
  );
}