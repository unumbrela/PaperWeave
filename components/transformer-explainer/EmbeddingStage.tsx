"use client";

import { useState } from "react";
import { Stage, PillGroup } from "./Stage";
import { Heatmap } from "./Heatmap";
import { STAGE_COLORS, DIMS } from "@/lib/transformer-explainer/config";
import type { ForwardTrace } from "@/lib/transformer-explainer/types";

type View = "嵌入" | "位置编码" | "相加";

export function EmbeddingStage({ trace }: { trace: ForwardTrace }) {
  const accent = STAGE_COLORS.embedding;
  const [view, setView] = useState<View>("相加");

  const data =
    view === "嵌入" ? trace.embeddings : view === "位置编码" ? trace.posEncoding : trace.posEncoded;

  return (
    <Stage
      step="步骤 02 · 嵌入"
      accent={accent}
      title={
        <>
          词嵌入 + 位置编码 · <span className="serif-italic">把 token 变成向量</span>
        </>
      }
      intro={
        <>
          每个 token id 去查一张可学习的<strong>嵌入表</strong>，取出一个 {DIMS.D_MODEL}{" "}
          维向量。因为注意力本身不分先后，还要再叠加一份<strong>正弦位置编码</strong>，
          把「谁在前、谁在后」写进向量里。切换下面三个视图看它们如何相加。
        </>
      }
    >
      <PillGroup
        options={["嵌入", "位置编码", "相加"] as View[]}
        value={view}
        onChange={setView}
        accent={accent}
      />
      <div className="mt-4 overflow-x-auto pb-2">
        <Heatmap data={data} rowLabels={trace.tokenStrs} cell={15} diverging />
      </div>
      <p className="mt-3 text-[12px] text-ink-3">
        每行是一个 token 的 {DIMS.D_MODEL} 维向量；
        <span style={{ color: "rgba(59,110,246,0.9)" }}>蓝=正</span>、
        <span style={{ color: "rgba(255,93,77,0.9)" }}>红=负</span>，颜色越深绝对值越大。
        {view === "位置编码" && "（位置编码只与位置有关，与具体词无关——所以同一行随句子变化时不变。）"}
      </p>
    </Stage>
  );
}
