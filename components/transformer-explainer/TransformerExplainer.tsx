"use client";

import { useMemo, useState } from "react";
import { Hero } from "./Hero";
import { TokenizeStage } from "./TokenizeStage";
import { EmbeddingStage } from "./EmbeddingStage";
import { AttentionStage } from "./AttentionStage";
import { MultiHeadStage } from "./MultiHeadStage";
import { FFNStage } from "./FFNStage";
import { BlockStack } from "./BlockStack";
import { OutputStage } from "./OutputStage";
import { FlowConnector } from "./FlowConnector";
import { Article } from "./Article";
import { References } from "./References";
import { runForward } from "@/lib/transformer-explainer/toy-model";
import { SENTENCES, ACCENT, TEMPERATURE } from "@/lib/transformer-explainer/config";

export function TransformerExplainer() {
  const [sentenceId, setSentenceId] = useState(SENTENCES[0].id);
  const [temperature, setTemperature] = useState<number>(TEMPERATURE.default);

  const sentence = useMemo(
    () => SENTENCES.find((s) => s.id === sentenceId) ?? SENTENCES[0],
    [sentenceId],
  );
  const trace = useMemo(() => runForward(sentence, temperature), [sentence, temperature]);
  const top1 = trace.topk[0];

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 pt-10 pb-20">
      <Hero />

      <div className="hairline mt-10" />

      {/* 全局控制条：选句子 + 实时预测 */}
      <div className="rise mt-8 surface rounded-2xl p-5" style={{ animationDelay: "200ms" }}>
        <div className="overline mb-3 text-[10px]">选择一句话（它的下一个词由整条流水线算出）</div>
        <div className="flex flex-wrap items-center gap-2">
          {SENTENCES.map((s) => {
            const active = s.id === sentenceId;
            return (
              <button
                key={s.id}
                onClick={() => setSentenceId(s.id)}
                className={`rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors ${
                  active ? "border-transparent text-white" : "border-line text-ink-2 hover:text-ink"
                }`}
                style={active ? { background: ACCENT } : undefined}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-baseline gap-2 text-[14px]">
          <span className="mono text-ink-2">{sentence.label}</span>
          <span className="text-ink-4">→ 预测：</span>
          <span className="serif text-[22px] text-ink">{top1.word}</span>
          <span className="mono text-[12px] text-ink-3">（{(top1.prob * 100).toFixed(1)}%）</span>
        </div>
      </div>

      {/* 移动端兜底 */}
      <div className="mt-8 rounded-2xl surface p-6 text-center lg:hidden">
        <p className="serif text-xl text-ink">
          <span className="serif-italic">Best on desktop.</span>
        </p>
        <p className="mt-2 text-sm text-ink-2">
          交互流水线为宽屏设计——请用宽度 ≥ 1024px 的浏览器打开以获得完整体验。下方讲解可正常阅读。
        </p>
      </div>

      {/* 端到端流水线（桌面） */}
      <div className="mt-8 hidden flex-col lg:flex">
        <TokenizeStage trace={trace} />
        <FlowConnector label="查嵌入表" />
        <EmbeddingStage trace={trace} />
        <FlowConnector label="算 QKV" />
        <AttentionStage trace={trace} />
        <FlowConnector label="并行多头" />
        <MultiHeadStage trace={trace} />
        <FlowConnector label="逐位置加工" />
        <FFNStage trace={trace} />
        <FlowConnector label="重复 N 层" />
        <BlockStack trace={trace} />
        <FlowConnector label="投影到词表" />
        <OutputStage trace={trace} temperature={temperature} onTemperature={setTemperature} />
      </div>

      {/* 讲解 + 参考文献（移动端也可读） */}
      <Article />
      <References />
    </div>
  );
}
