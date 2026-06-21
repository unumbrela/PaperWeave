"use client";

import { useState } from "react";
import { Stage, PillGroup } from "./Stage";
import { Heatmap } from "./Heatmap";
import { STAGE_COLORS, HEAD_COLORS, DIMS } from "@/lib/transformer-explainer/config";
import type { ForwardTrace } from "@/lib/transformer-explainer/types";

export function AttentionStage({ trace }: { trace: ForwardTrace }) {
  const accent = STAGE_COLORS.attention;
  const [head, setHead] = useState(0);
  const [hoverRow, setHoverRow] = useState<number | null>(null);

  const block = trace.blocks[0];
  const h = block.heads[head];
  const seq = trace.tokens.length;
  const headColor = HEAD_COLORS[head % HEAD_COLORS.length];
  const queryRow = hoverRow ?? seq - 1; // 默认看最后一个 token 的注意力

  return (
    <Stage
      step="步骤 03 · 自注意力"
      accent={accent}
      title={
        <>
          掩码自注意力 · <span className="serif-italic">每个词该看谁</span>
        </>
      }
      intro={
        <>
          每个 token 由它的向量算出三样东西：<strong>Query（我要找什么）</strong>、
          <strong>Key（我能提供什么）</strong>、<strong>Value（我携带的信息）</strong>。
          用 Q 和所有 K 做点积、除以 √d、再 softmax，就得到「这个词该分多少注意力给别的词」。
          因为是预测下一个词，每个位置<strong>只能看自己及左边</strong>（因果掩码）。
        </>
      }
    >
      <div className="flex items-center gap-3">
        <span className="overline text-[10px]">选择注意力头</span>
        <PillGroup
          options={Array.from({ length: DIMS.N_HEADS }, (_, i) => i)}
          value={head}
          onChange={setHead}
          accent={headColor}
          render={(i) => `Head ${i + 1}`}
        />
        <span className="text-[11px] text-ink-3">（第 1 个 Block）</span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 左：Q / K / V */}
        <div>
          <div className="overline mb-2 text-[10px]">Q · K · V（{DIMS.D_HEAD} 维 / 头）</div>
          <div className="flex flex-wrap gap-5">
            {([
              ["Q", h.q],
              ["K", h.k],
              ["V", h.v],
            ] as const).map(([name, m]) => (
              <div key={name}>
                <div className="mono mb-1 text-[11px] text-ink-2">{name}</div>
                <Heatmap data={m} rowLabels={trace.tokenStrs} cell={13} diverging />
              </div>
            ))}
          </div>
        </div>

        {/* 右：注意力矩阵 */}
        <div>
          <div className="overline mb-2 text-[10px]">
            注意力权重 = softmax(QKᵀ / √d)　行=查询，列=被看
          </div>
          <div className="overflow-x-auto pb-1">
            <Heatmap
              data={h.scores}
              rowLabels={trace.tokenStrs}
              colLabels={trace.tokenStrs}
              cell={30}
              diverging={false}
              color={headColor}
              domainMax={1}
              highlightRow={hoverRow}
              onRowHover={setHoverRow}
              showValues
            />
          </div>
          <p className="mt-2 text-[11.5px] text-ink-3">
            右上方的空白三角是<strong>被掩码</strong>的未来位置。把鼠标移到某一行，
            看那个词把注意力分给了谁 ↓
          </p>
        </div>
      </div>

      {/* 选中查询的权重条 */}
      <div className="mt-5 rounded-xl border border-line bg-paper-2 p-4">
        <div className="text-[12.5px] text-ink-2">
          「<span className="serif text-ink">{trace.tokenStrs[queryRow]}</span>」（位置 {queryRow}）
          的注意力分配：
        </div>
        <div className="mt-3 space-y-1.5">
          {h.scores[queryRow].map((w, j) => {
            const masked = j > queryRow;
            return (
              <div key={j} className="flex items-center gap-2">
                <span className="mono w-16 shrink-0 text-right text-[11px] text-ink-3">
                  {trace.tokenStrs[j]}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded bg-[rgba(26,23,19,0.05)]">
                  <div
                    className="h-full rounded"
                    style={{ width: `${(masked ? 0 : w) * 100}%`, background: headColor }}
                  />
                </div>
                <span className="mono w-12 shrink-0 text-right text-[10.5px] text-ink-3">
                  {masked ? "—" : w.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-ink-4">
          每个词把它的 Value 按这些权重加权求和，得到这一层、这个头的输出向量。
        </p>
      </div>
    </Stage>
  );
}
