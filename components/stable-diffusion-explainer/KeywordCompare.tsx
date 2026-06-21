"use client";

import { useState } from "react";
import {
  PAIRS,
  MAX_T,
  framePath,
  promptsOfPair,
} from "@/lib/stable-diffusion-explainer/config";

const ACCENT = "#ec4899";

export function KeywordCompare() {
  const [pairId, setPairId] = useState("castle");
  const pair = PAIRS.find((p) => p.id === pairId) ?? PAIRS[0];
  const { base, styled } = promptsOfPair(pairId);
  const seed = 1;
  const gs = "7.0";

  return (
    <section className="rise surface rounded-2xl p-6" style={{ animationDelay: "200ms" }}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="serif text-[26px] text-ink">
          文字怎么影响画面 · <span className="serif-italic">一个词的力量</span>
        </h2>
        <span className="overline" style={{ color: ACCENT }}>
          交互 02
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink-2">
        同样的随机种子、同样的引导强度，只在提示词后面加一个风格/场景词，成图就大不相同——
        这就是文本条件（text conditioning）在起作用。换一组对比看看。
      </p>

      {/* pair 选择 */}
      <div className="mt-4 flex flex-wrap gap-2">
        {PAIRS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPairId(p.id)}
            className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
              pairId === p.id
                ? "border-transparent text-white"
                : "border-line text-ink-2 hover:text-ink"
            }`}
            style={pairId === p.id ? { background: ACCENT } : undefined}
          >
            {p.zh}
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-5">
        {[base, styled].map((p, i) => (
          <figure key={p.id} className="m-0">
            <div className="overflow-hidden rounded-xl border border-line bg-paper-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={framePath(p.dir, seed, gs, MAX_T)}
                alt={p.zh}
                width={256}
                height={256}
                className="block aspect-square w-full"
                draggable={false}
              />
            </div>
            <figcaption className="mt-2 text-center text-[12px] text-ink-2">
              {i === 0 ? (
                <>基础提示词</>
              ) : (
                <>
                  ＋ <span style={{ color: ACCENT }} className="font-medium">{pair.keywordZh}</span>
                </>
              )}
            </figcaption>
          </figure>
        ))}
      </div>

      <p className="mt-4 text-[12.5px] text-ink-2">
        加入的词：<span className="mono rounded bg-[rgba(26,23,19,0.05)] px-1.5 py-0.5" style={{ color: ACCENT }}>
          {pair.keyword}
        </span>
        <span className="text-ink-3">　（同 seed=1、guidance=7、最终成图对比）</span>
      </p>
    </section>
  );
}
