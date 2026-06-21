"use client";

import { Stage } from "./Stage";
import { Heatmap } from "./Heatmap";
import { STAGE_COLORS, HEAD_COLORS, DIMS } from "@/lib/transformer-explainer/config";
import type { ForwardTrace } from "@/lib/transformer-explainer/types";

export function MultiHeadStage({ trace }: { trace: ForwardTrace }) {
  const accent = STAGE_COLORS.multihead;
  const block = trace.blocks[0];

  return (
    <Stage
      step="步骤 04 · 多头"
      accent={accent}
      title={
        <>
          多头注意力 · <span className="serif-italic">几个头各看一面</span>
        </>
      }
      intro={
        <>
          一个头只能学一种「关注模式」。Transformer 同时并行跑 {DIMS.N_HEADS}{" "}
          个头，各自有独立的 Q/K/V，捕捉不同的依赖关系；再把它们的输出
          <strong>拼接</strong>起来，过一个<strong>输出投影 W<sub>o</sub></strong>融合成一个向量。
        </>
      }
    >
      <div className="overline mb-2 text-[10px]">{DIMS.N_HEADS} 个头的注意力模式（同一句话，各看各的）</div>
      <div className="flex flex-wrap gap-6">
        {block.heads.map((h, idx) => (
          <div key={idx}>
            <div className="mono mb-1 text-[11px]" style={{ color: HEAD_COLORS[idx % HEAD_COLORS.length] }}>
              Head {idx + 1}
            </div>
            <Heatmap
              data={h.scores}
              rowLabels={trace.tokenStrs}
              cell={20}
              diverging={false}
              color={HEAD_COLORS[idx % HEAD_COLORS.length]}
              domainMax={1}
            />
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="overline mb-2 text-[10px]">拼接：{DIMS.N_HEADS} × {DIMS.D_HEAD} = {DIMS.D_MODEL} 维</div>
          <Heatmap data={block.mhaConcat} rowLabels={trace.tokenStrs} cell={13} diverging />
        </div>
        <div>
          <div className="overline mb-2 text-[10px]">输出投影后（× W&#8338;）</div>
          <Heatmap data={block.attnOut} rowLabels={trace.tokenStrs} cell={13} diverging />
        </div>
      </div>
    </Stage>
  );
}
