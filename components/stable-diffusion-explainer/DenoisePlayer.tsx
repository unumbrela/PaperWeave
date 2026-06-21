"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import {
  PROMPTS,
  PAIRS,
  SEEDS,
  GUIDANCE,
  GUIDANCE_LABEL,
  MAX_T,
  framePath,
  getPrompt,
  type Guidance,
} from "@/lib/stable-diffusion-explainer/config";

const ACCENT = "#ec4899";
const STEP_MS = 90;

function stage(t: number): { label: string; color: string } {
  if (t <= 3) return { label: "纯噪声", color: "#7a736a" };
  if (t < 20) return { label: "轮廓浮现", color: "#8854d0" };
  if (t < 42) return { label: "细节成形", color: "#3b6ef6" };
  return { label: "成图", color: "#6b9b6f" };
}

export function DenoisePlayer() {
  const [promptId, setPromptId] = useState("castle-artstation");
  const [seed, setSeed] = useState<number>(1);
  const [gs, setGs] = useState<Guidance>("7.0");
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);

  const prompt = getPrompt(promptId);
  const dir = prompt.dir;

  // 预加载当前 (prompt, seed, gs) 的 51 帧，保证拖动/播放顺滑。
  const preloadRef = useRef<HTMLImageElement[]>([]);
  useEffect(() => {
    const imgs: HTMLImageElement[] = [];
    for (let i = 0; i <= MAX_T; i++) {
      const im = new Image();
      im.src = framePath(dir, seed, gs, i);
      imgs.push(im);
    }
    preloadRef.current = imgs;
  }, [dir, seed, gs]);

  // 自动播放：t 从 0 走到 50 后停。
  useEffect(() => {
    if (!playing) return;
    if (t >= MAX_T) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setT((v) => Math.min(MAX_T, v + 1)), STEP_MS);
    return () => clearTimeout(id);
  }, [playing, t]);

  const togglePlay = () => {
    if (!playing && t >= MAX_T) setT(0); // 到头了就从噪声重播
    setPlaying((p) => !p);
  };
  const step = (d: number) => {
    setPlaying(false);
    setT((v) => Math.max(0, Math.min(MAX_T, v + d)));
  };

  const src = useMemo(() => framePath(dir, seed, gs, t), [dir, seed, gs, t]);
  const st = stage(t);
  const progress = (t / MAX_T) * 100;

  return (
    <section className="rise surface rounded-2xl p-6" style={{ animationDelay: "120ms" }}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="serif text-[26px] text-ink">
          反向去噪 · <span className="serif-italic">看图从噪声里浮现</span>
        </h2>
        <span className="overline" style={{ color: ACCENT }}>
          交互 01
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink-2">
        模型从一团纯随机噪声出发（t=0），在文字提示的牵引下，一步步把噪声「擦掉」，
        直到第 50 步显出成图。拖动下方时间轴，或点播放，亲眼看它如何成形。
      </p>

      <div className="mt-6 grid grid-cols-12 gap-6">
        {/* 左：图像 */}
        <div className="col-span-12 lg:col-span-5">
          <div className="relative overflow-hidden rounded-xl border border-line bg-paper-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`${prompt.zh} · t=${t}`}
              width={256}
              height={256}
              className="block aspect-square w-full"
              draggable={false}
            />
            <div className="absolute left-3 top-3 flex items-center gap-2">
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-medium text-white"
                style={{ background: st.color }}
              >
                {st.label}
              </span>
            </div>
            <div className="absolute right-3 top-3 rounded-full bg-paper/85 px-2.5 py-1 text-[11px] text-ink-2 backdrop-blur-sm mono">
              t = {t} / {MAX_T}
            </div>
          </div>
          <p className="mt-2 text-center text-[11.5px] text-ink-3">
            提示词：<span className="mono">{prompt.en}</span>
          </p>
        </div>

        {/* 右：控制 */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-5">
          {/* prompt */}
          <div>
            <div className="overline mb-2">提示词 Prompt</div>
            <div className="flex flex-wrap gap-2">
              {PAIRS.map((pair) => {
                const items = PROMPTS.filter((p) => p.pair === pair.id);
                return items.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPromptId(p.id);
                      setPlaying(false);
                      setT(0);
                    }}
                    className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
                      promptId === p.id
                        ? "border-transparent text-white"
                        : "border-line text-ink-2 hover:text-ink"
                    }`}
                    style={promptId === p.id ? { background: ACCENT } : undefined}
                  >
                    {p.zh}
                  </button>
                ));
              })}
            </div>
          </div>

          {/* seed + guidance */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <div className="overline mb-2">随机种子 Seed</div>
              <div className="flex gap-2">
                {SEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSeed(s);
                      setPlaying(false);
                    }}
                    className={`h-9 w-9 rounded-lg border text-[13px] transition-colors ${
                      seed === s
                        ? "border-transparent text-white"
                        : "border-line text-ink-2 hover:text-ink"
                    }`}
                    style={seed === s ? { background: "#3b6ef6" } : undefined}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-ink-3">换种子＝换初始噪声＝换一张构图</p>
            </div>
            <div>
              <div className="overline mb-2">引导强度 Guidance</div>
              <div className="flex gap-2">
                {GUIDANCE.map((g) => (
                  <button
                    key={g}
                    onClick={() => {
                      setGs(g);
                      setPlaying(false);
                    }}
                    className={`h-9 min-w-9 rounded-lg border px-2 text-[13px] transition-colors ${
                      gs === g
                        ? "border-transparent text-white"
                        : "border-line text-ink-2 hover:text-ink"
                    }`}
                    style={gs === g ? { background: "#8854d0" } : undefined}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-ink-3">{GUIDANCE_LABEL[gs]}</p>
            </div>
          </div>

          {/* 时间轴 */}
          <div className="mt-auto">
            <div className="overline mb-2">去噪时间轴 Timestep</div>
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium text-white"
                style={{ background: ACCENT }}
              >
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {playing ? "暂停" : "播放"}
              </button>
              <button
                onClick={() => step(-1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-2 hover:text-ink"
                aria-label="上一步"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => step(1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-2 hover:text-ink"
                aria-label="下一步"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={MAX_T}
              step={1}
              value={t}
              onChange={(e) => {
                setPlaying(false);
                setT(Number(e.target.value));
              }}
              className="mt-3 w-full"
              style={{ accentColor: ACCENT }}
            />
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[rgba(26,23,19,0.08)]">
              <div
                className="h-full rounded-full transition-[width] duration-100"
                style={{ width: `${progress}%`, background: ACCENT }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10.5px] text-ink-3">
              <span>0 · 纯噪声</span>
              <span>50 · 成图</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
