"use client";

import { Stage } from "./Stage";
import { STAGE_COLORS } from "@/lib/transformer-explainer/config";
import type { ForwardTrace } from "@/lib/transformer-explainer/types";

export function TokenizeStage({ trace }: { trace: ForwardTrace }) {
  const accent = STAGE_COLORS.token;
  return (
    <Stage
      step="步骤 01 · 分词"
      accent={accent}
      title={
        <>
          分词 · <span className="serif-italic">把句子切成 token</span>
        </>
      }
      intro={
        <>
          模型不直接读字符串。它先把句子按词表切成一个个 <strong>token</strong>，
          每个 token 对应词表里的一个整数 id。下面每张卡片就是一个 token——id 是它在玩具词表中的位置。
        </>
      }
    >
      <div className="flex flex-wrap items-stretch gap-3">
        {trace.tokenStrs.map((w, i) => (
          <div
            key={i}
            className="flex flex-col items-center rounded-xl border border-line bg-paper-2 px-4 py-3"
          >
            <span className="serif text-[18px] text-ink">{w}</span>
            <span className="mono mt-1 text-[10px] text-ink-3">id {trace.tokens[i]}</span>
            <span className="mono mt-0.5 text-[10px] text-ink-4">位置 {i}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[12px] text-ink-3">
        共 {trace.tokens.length} 个 token。下面所有矩阵的「行」都对应这 {trace.tokens.length}{" "}
        个位置，自上而下一一对齐。
      </p>
    </Stage>
  );
}
