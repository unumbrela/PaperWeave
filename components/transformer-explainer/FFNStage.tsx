"use client";

import { Stage } from "./Stage";
import { Heatmap } from "./Heatmap";
import { STAGE_COLORS, DIMS } from "@/lib/transformer-explainer/config";
import type { ForwardTrace } from "@/lib/transformer-explainer/types";

export function FFNStage({ trace }: { trace: ForwardTrace }) {
  const accent = STAGE_COLORS.ffn;
  const block = trace.blocks[0];

  return (
    <Stage
      step="步骤 05 · 前馈 + 残差"
      accent={accent}
      title={
        <>
          前馈网络 + 残差 &amp; 归一化 · <span className="serif-italic">逐位置再加工</span>
        </>
      }
      intro={
        <>
          注意力负责「让词之间交换信息」，前馈网络（FFN）则对<strong>每个位置独立</strong>地再做一次非线性变换：
          先升维到 {DIMS.D_FF}、过 GELU、再降回 {DIMS.D_MODEL}。每个子层外面都套一层
          <strong>残差连接（加回输入）+ LayerNorm</strong>，让深层网络稳得住、训得动。
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="overline mb-2 text-[10px]">注意力后（残差 + LN）→ FFN 输入</div>
          <Heatmap data={block.afterAttnNorm} rowLabels={trace.tokenStrs} cell={13} diverging />
        </div>
        <div>
          <div className="overline mb-2 text-[10px]">FFN 隐层（升维到 {DIMS.D_FF}，过 GELU）</div>
          <div className="overflow-x-auto pb-1">
            <Heatmap data={block.ffnHidden} rowLabels={trace.tokenStrs} cell={9} diverging />
          </div>
        </div>
        <div>
          <div className="overline mb-2 text-[10px]">FFN 输出（降回 {DIMS.D_MODEL}）</div>
          <Heatmap data={block.ffnOut} rowLabels={trace.tokenStrs} cell={13} diverging />
        </div>
        <div>
          <div className="overline mb-2 text-[10px]">本 Block 最终输出（残差 + LN）</div>
          <Heatmap data={block.output} rowLabels={trace.tokenStrs} cell={13} diverging />
        </div>
      </div>
      <p className="mt-3 text-[12px] text-ink-3">
        注意：LayerNorm 把每行拉回到均值 0、方差 1，所以「最终输出」的颜色分布比中间结果更均匀。
      </p>
    </Stage>
  );
}
