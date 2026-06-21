"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Layers } from "lucide-react";
import { Stage } from "./Stage";
import { Heatmap } from "./Heatmap";
import { ACCENT, DIMS } from "@/lib/transformer-explainer/config";
import type { ForwardTrace } from "@/lib/transformer-explainer/types";

export function BlockStack({ trace }: { trace: ForwardTrace }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Stage
      step="步骤 06 · 堆叠"
      accent={ACCENT}
      title={
        <>
          堆叠 Transformer Block · <span className="serif-italic">同一套结构重复 N 次</span>
        </>
      }
      intro={
        <>
          「多头注意力 + 前馈」合起来就是一个 <strong>Transformer Block</strong>。真正的模型把它
          <strong>重复堆叠</strong>几十层（GPT-2 small 是 12 层），上一层的输出就是下一层的输入，
          越往上表示越抽象。本玩具模型堆了 {DIMS.N_BLOCKS} 层，下面是每层输出的向量。
        </>
      }
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[12px] text-ink-2 hover:text-ink"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {expanded ? "收起各层输出" : "展开各层输出"}
      </button>

      {expanded ? (
        <div className="mt-4 space-y-5">
          {trace.blocks.map((b, i) => (
            <div key={i}>
              <div className="overline mb-2 text-[10px]">Block {i + 1} 输出</div>
              <Heatmap data={b.output} rowLabels={trace.tokenStrs} cell={13} diverging />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {trace.blocks.map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-line bg-paper-2 px-4 py-3">
                <Layers className="h-4 w-4 text-ink-3" />
                <span className="serif text-[15px] text-ink">Block {i + 1}</span>
              </div>
              {i < trace.blocks.length - 1 && <ChevronRight className="h-4 w-4 text-ink-4" />}
            </div>
          ))}
          <span className="text-[12px] text-ink-3">→ 末端</span>
        </div>
      )}
    </Stage>
  );
}
