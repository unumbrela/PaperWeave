"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as tf from "@tensorflow/tfjs";
import { Eye, Palette, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { Hero } from "./Hero";
import { ImagePicker } from "./ImagePicker";
import { Overview } from "./Overview";
import { Article } from "./Article";

import { imageOptions } from "@/lib/cnn-explainer/config";
import type { CNN, ScaleLevel } from "@/lib/cnn-explainer/types";

const MODEL_URL = "/cnn-explainer/assets/data/model.json";

export function CNNExplainer() {
  const [cnn, setCnn] = useState<CNN | null>(null);
  const [loading, setLoading] = useState<"init" | "inference" | "idle">("init");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>(
    imageOptions[6].file, // espresso, same default as original
  );
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const [scaleLevel, setScaleLevel] = useState<ScaleLevel>("local");
  const [detailedMode, setDetailedMode] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<{ show: boolean; text: string }>({
    show: false,
    text: "",
  });

  const modelRef = useRef<tf.LayersModel | null>(null);
  const runTokenRef = useRef(0);

  // Load model once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tfModule = await import("@tensorflow/tfjs");
        const { loadTrainedModel, constructCNN } = await import(
          "@/lib/cnn-explainer/cnn-model"
        );
        await tfModule.ready();
        const model = await loadTrainedModel(MODEL_URL);
        if (cancelled) return;
        modelRef.current = model;
        const initialCNN = await constructCNN(
          `/cnn-explainer/assets/img/${imageOptions[6].file}`,
          model,
        );
        if (cancelled) return;
        setCnn(initialCNN);
        setLoading("idle");
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "加载失败");
          setLoading("idle");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-run inference when selectedImage or customImageUrl changes
  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;
    if (!cnn) return; // initial run handled above

    const token = ++runTokenRef.current;
    (async () => {
      setLoading("inference");
      try {
        const { constructCNN } = await import("@/lib/cnn-explainer/cnn-model");
        const src =
          selectedImage === "custom" && customImageUrl
            ? customImageUrl
            : `/cnn-explainer/assets/img/${selectedImage}`;
        const newCNN = await constructCNN(src, model);
        if (runTokenRef.current !== token) return;
        setCnn(newCNN);
        setLoading("idle");
      } catch (err) {
        console.error(err);
        if (runTokenRef.current === token) setLoading("idle");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImage, customImageUrl]);

  const handleCustomImage = useCallback((dataUrl: string) => {
    setCustomImageUrl(dataUrl);
    setSelectedImage("custom");
  }, []);

  const inferenceBusy = loading === "inference";

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 pt-10 pb-20">
      <Hero />

      {/* Mobile fallback */}
      <div className="mt-10 rounded-2xl surface p-6 text-center lg:hidden">
        <p className="serif text-xl text-ink">
          <span className="serif-italic">Best on desktop.</span>
        </p>
        <p className="mt-2 text-sm text-ink-2">
          这个可视化在大屏上更美——请用宽度 ≥ 1024px 的浏览器打开以获得完整体验。
        </p>
      </div>

      {/* Desktop experience */}
      <div className="mt-10 hidden lg:block">
        {/* Control bar */}
        <div
          className="rise-d flex flex-wrap items-center justify-between gap-4"
          style={{ animationDelay: "260ms" }}
        >
          <div className="flex items-center gap-3">
            <ImagePicker
              selected={selectedImage}
              onSelect={setSelectedImage}
              onCustomImage={handleCustomImage}
              disabled={loading === "init"}
              customImageUrl={customImageUrl}
            />
            {hoverInfo.show && (
              <span className="surface rounded-full px-3 py-1 text-[12px] text-ink-2">
                {hoverInfo.text}
              </span>
            )}
            {inferenceBusy && (
              <span className="text-[12px] text-ink-3 inline-flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                推理中
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDetailedMode((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition-colors",
                detailedMode
                  ? "border-ink bg-ink text-paper"
                  : "border-[var(--line-strong)] text-ink-2 hover:text-ink hover:border-ink/50",
              )}
              title="显示每层维度和色阶图例"
            >
              <Eye className="h-3.5 w-3.5" />
              {detailedMode ? "详情模式 · 开" : "详情模式"}
            </button>

            <div
              className={cn(
                "surface rounded-full p-0.5 flex items-center gap-0.5",
                "border border-[var(--line)]",
              )}
            >
              <Palette className="ml-2 mr-1 h-3.5 w-3.5 text-ink-3" />
              {(
                [
                  { v: "local", l: "Unit" },
                  { v: "module", l: "Module" },
                  { v: "global", l: "Global" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setScaleLevel(opt.v)}
                  className={cn(
                    "px-3 py-1 text-[11.5px] rounded-full transition-colors",
                    scaleLevel === opt.v
                      ? "bg-ink text-paper-2"
                      : "text-ink-2 hover:text-ink",
                  )}
                  title={`色阶粒度：${opt.l}`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Visualization surface */}
        <div
          className={cn(
            "rise mt-6 surface rounded-2xl",
            "overflow-hidden border border-[var(--line)]",
            "relative",
          )}
          style={{ animationDelay: "360ms" }}
        >
          {loading === "init" && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-3 text-ink-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-[13px]">加载 tiny-VGG 模型…</span>
              </div>
            </div>
          )}
          {loadError && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <p className="serif-italic text-ink-2 text-lg">加载失败</p>
                <p className="mt-1 text-[13px] text-ink-3">{loadError}</p>
              </div>
            </div>
          )}
          <Overview
            cnn={cnn}
            scaleLevel={scaleLevel}
            detailedMode={detailedMode}
            onHoverInfo={setHoverInfo}
          />
        </div>
      </div>

      <Article />
    </div>
  );
}
