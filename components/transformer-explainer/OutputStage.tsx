"use client";

import { Stage } from "./Stage";
import { STAGE_COLORS, TEMPERATURE } from "@/lib/transformer-explainer/config";
import type { ForwardTrace } from "@/lib/transformer-explainer/types";

export function OutputStage({
  trace,
  temperature,
  onTemperature,
}: {
  trace: ForwardTrace;
  temperature: number;
  onTemperature: (t: number) => void;
}) {
  const accent = STAGE_COLORS.output;
  const top1 = trace.topk[0];
  const maxProb = Math.max(...trace.topk.map((t) => t.prob));

  return (
    <Stage
      step="步骤 07 · 输出"
      accent={accent}
      title={
        <>
          输出预测 · <span className="serif-italic">下一个词是什么</span>
        </>
      }
      intro={
        <>
          取<strong>最后一个位置</strong>的向量，过末端 LayerNorm，再用嵌入表（共享权重）投影回整个词表，
          得到每个词的 logit；最后 softmax 成概率。
          <strong>温度</strong>控制分布的「陡峭程度」：低温更笃定，高温更随机。
        </>
      }
    >
      {/* 预测结论 */}
      <div className="rounded-xl border border-line bg-paper-2 p-4">
        <div className="text-[13px] text-ink-2">
          <span className="mono">{trace.tokenStrs.join(" ")}</span>
          <span className="mx-2 text-ink-4">→</span>
          <span className="serif text-[20px]" style={{ color: "rgba(26,23,19,0.95)" }}>
            {top1.word}
          </span>
          <span className="ml-2 mono text-[12px] text-ink-3">
            （{(top1.prob * 100).toFixed(1)}%）
          </span>
        </div>
      </div>

      {/* 温度 */}
      <div className="mt-5">
        <div className="flex items-center justify-between">
          <span className="overline text-[10px]">温度 Temperature</span>
          <span className="mono text-[12px] text-ink-2">{temperature.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={TEMPERATURE.min}
          max={TEMPERATURE.max}
          step={TEMPERATURE.step}
          value={temperature}
          onChange={(e) => onTemperature(Number(e.target.value))}
          className="mt-2 w-full"
          style={{ accentColor: accent }}
        />
        <div className="mt-1 flex justify-between text-[10.5px] text-ink-3">
          <span>{TEMPERATURE.min} · 笃定</span>
          <span>{TEMPERATURE.max} · 随机</span>
        </div>
      </div>

      {/* Top-K 概率条 */}
      <div className="mt-5">
        <div className="overline mb-2 text-[10px]">Top-{trace.topk.length} 候选下一个词</div>
        <div className="space-y-2">
          {trace.topk.map((item, idx) => (
            <div key={item.token} className="flex items-center gap-3">
              <span
                className={`w-20 shrink-0 text-right text-[13px] ${idx === 0 ? "serif text-ink" : "text-ink-2"}`}
              >
                {item.word}
              </span>
              <div className="h-5 flex-1 overflow-hidden rounded bg-[rgba(26,23,19,0.05)]">
                <div
                  className="h-full rounded transition-[width] duration-150"
                  style={{
                    width: `${(item.prob / maxProb) * 100}%`,
                    background: idx === 0 ? accent : "rgba(122,115,106,0.55)",
                  }}
                />
              </div>
              <span className="mono w-14 shrink-0 text-right text-[11px] text-ink-3">
                {(item.prob * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-[12px] text-ink-3">
        把预测出的词接到句子末尾，再跑一遍整条流水线，就能续写下一个词——这正是大模型「生成」的全过程。
      </p>
    </Stage>
  );
}
