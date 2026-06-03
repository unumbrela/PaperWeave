"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Hero } from "./Hero";
import { Article } from "./Article";
import { Overview } from "./Overview";
import { SentenceSelector } from "./SentenceSelector";
import { AttentionVisualizer } from "./AttentionVisualizer";
import { constructTransformer, computeAttentionHeads } from "@/lib/transformer-explainer/transformer-model";
import type { Transformer, ScaleLevel, AttentionHead } from "@/lib/transformer-explainer/types";
import { exampleSentences } from "@/lib/transformer-explainer/config";

export function TransformerExplainer() {
  const [selectedSentenceIndex, setSelectedSentenceIndex] = useState(0);
  const [customText, setCustomText] = useState("");
  const [transformer, setTransformer] = useState<Transformer | null>(null);
  const [scaleLevel, setScaleLevel] = useState<ScaleLevel>("global");
  const [detailedMode, setDetailedMode] = useState(false);
  const [showResidual, setShowResidual] = useState(true);
  const [selectedAttentionLayer, setSelectedAttentionLayer] = useState(0);
  const [selectedAttentionHead, setSelectedAttentionHead] = useState(0);
  const [hoveredAttentionCell, setHoveredAttentionCell] = useState<{ row: number; col: number } | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ show: boolean; text: string }>({ show: false, text: "" });

  const attentionHeads = useMemo<AttentionHead[][]>(() => {
    if (!transformer) return [];
    return computeAttentionHeads(transformer);
  }, [transformer]);

  const tokenCount = useMemo(() => {
    const inputText = customText || exampleSentences[selectedSentenceIndex].text;
    const tokens = inputText.split(" ").filter(Boolean);
    return Math.min(tokens.length, 8);
  }, [selectedSentenceIndex, customText]);

  useEffect(() => {
    const inputText = customText || exampleSentences[selectedSentenceIndex].text;
    const newTransformer = constructTransformer(inputText);
    setTransformer(newTransformer);
    setSelectedAttentionLayer(0);
    setSelectedAttentionHead(0);
    setHoveredAttentionCell(null);
  }, [selectedSentenceIndex, customText]);

  const layerLabels = [
    "Input",
    "Embedding",
    "MHA_1",
    "Norm_1",
    "FFN_1",
    "Norm_2",
    "MHA_2",
    "Norm_3",
    "FFN_2",
    "Norm_4",
    "Output",
  ];

  const handleAttentionCellHover = useCallback((row: number, col: number) => {
    setHoveredAttentionCell({ row, col });
    setHoverInfo({
      show: true,
      text: `Token ${row + 1} 对 Token ${col + 1} 的注意力权重`,
    });
  }, []);

  const handleAttentionCellLeave = useCallback(() => {
    setHoveredAttentionCell(null);
    setHoverInfo({ show: false, text: "" });
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 pt-10 pb-20">
      <Hero />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div
            className="rise surface rounded-2xl overflow-hidden border border-[var(--line)] p-6"
            style={{ animationDelay: "360ms" }}
          >
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <h3 className="serif text-lg text-ink">Transformer 架构可视化</h3>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setScaleLevel("local")}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                      scaleLevel === "local"
                        ? "bg-[#f4c25a] text-ink"
                        : "bg-surface border border-[var(--line)] text-ink-2 hover:border-[#f4c25a]"
                    }`}
                  >
                    Local
                  </button>
                  <button
                    onClick={() => setScaleLevel("module")}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                      scaleLevel === "module"
                        ? "bg-[#f4c25a] text-ink"
                        : "bg-surface border border-[var(--line)] text-ink-2 hover:border-[#f4c25a]"
                    }`}
                  >
                    Module
                  </button>
                  <button
                    onClick={() => setScaleLevel("global")}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                      scaleLevel === "global"
                        ? "bg-[#f4c25a] text-ink"
                        : "bg-surface border border-[var(--line)] text-ink-2 hover:border-[#f4c25a]"
                    }`}
                  >
                    Global
                  </button>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={detailedMode}
                    onChange={(e) => setDetailedMode(e.target.checked)}
                    className="sr-only"
                  />
                  <span className={`w-9 h-5 rounded-full transition-colors ${detailedMode ? "bg-[#f4c25a]" : "bg-[var(--line)]"}`}>
                    <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${detailedMode ? "translate-x-4" : "translate-x-0.5"}`} />
                  </span>
                  <span className="text-xs text-ink-2">详细模式</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showResidual}
                    onChange={(e) => setShowResidual(e.target.checked)}
                    className="sr-only"
                  />
                  <span className={`w-9 h-5 rounded-full transition-colors ${showResidual ? "bg-green-500" : "bg-[var(--line)]"}`}>
                    <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${showResidual ? "translate-x-4" : "translate-x-0.5"}`} />
                  </span>
                  <span className="text-xs text-ink-2">残差连接</span>
                </label>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-ink-3 mb-3">选择输入句子（{tokenCount}/8 个有效 Token）：</p>
              <SentenceSelector
                selectedIndex={selectedSentenceIndex}
                customText={customText}
                onSelect={setSelectedSentenceIndex}
                onCustomChange={setCustomText}
              />
            </div>

            {hoverInfo.show && (
              <div className="mb-4 px-4 py-2 bg-[#f4c25a]/10 rounded-lg text-sm text-ink">
                {hoverInfo.text}
              </div>
            )}

            <Overview
              transformer={transformer}
              scaleLevel={scaleLevel}
              detailedMode={detailedMode}
              showResidual={showResidual}
              hoveredAttentionCell={hoveredAttentionCell}
              tokenCount={tokenCount}
              onHoverInfo={setHoverInfo}
            />

            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {layerLabels.map((label, index) => (
                <span
                  key={index}
                  className={`px-3 py-1 rounded-full text-xs ${
                    label.includes("MHA")
                      ? "bg-purple-100 text-purple-700"
                      : label.includes("Norm")
                      ? "bg-green-100 text-green-700"
                      : label.includes("FFN")
                      ? "bg-orange-100 text-orange-700"
                      : label === "Input"
                      ? "bg-blue-100 text-blue-700"
                      : label === "Embedding"
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="rise surface rounded-2xl overflow-hidden border border-[var(--line)] p-6">
            <h3 className="serif text-lg text-ink mb-4">注意力权重矩阵</h3>
            
            <div className="mb-4">
              <label className="text-xs text-ink-3 block mb-2">选择编码器层</label>
              <div className="flex gap-2">
                {attentionHeads.map((_, layerIndex) => (
                  <button
                    key={layerIndex}
                    onClick={() => {
                      setSelectedAttentionLayer(layerIndex);
                      setSelectedAttentionHead(0);
                    }}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs transition-all ${
                      selectedAttentionLayer === layerIndex
                        ? "bg-[#f4c25a] text-ink"
                        : "bg-surface border border-[var(--line)] text-ink-2 hover:border-[#f4c25a]"
                    }`}
                  >
                    MHA {layerIndex + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-xs text-ink-3 block mb-2">选择 Token（查询）</label>
              <div className="flex gap-2 flex-wrap">
                {attentionHeads[selectedAttentionLayer]?.map((_, headIndex) => (
                  <button
                    key={headIndex}
                    onClick={() => setSelectedAttentionHead(headIndex)}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                      headIndex >= tokenCount
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : selectedAttentionHead === headIndex
                        ? "bg-[#f4c25a] text-ink"
                        : "bg-surface border border-[var(--line)] text-ink-2 hover:border-[#f4c25a]"
                    }`}
                    disabled={headIndex >= tokenCount}
                  >
                    Token {headIndex + 1}
                    {headIndex >= tokenCount && <span className="ml-1 opacity-50">(Mask)</span>}
                  </button>
                ))}
              </div>
            </div>

            <AttentionVisualizer
              heads={attentionHeads}
              selectedLayer={selectedAttentionLayer}
              selectedHead={selectedAttentionHead}
              tokenCount={tokenCount}
              onCellHover={handleAttentionCellHover}
              onCellLeave={handleAttentionCellLeave}
            />

            <div className="mt-6 pt-4 border-t border-[var(--line)]">
              <p className="text-xs text-ink-3 mb-2">
                注意力权重矩阵展示了每个 Token 对其他所有 Token 的关注程度。
              </p>
              <p className="text-xs text-ink-3">
                行表示"查询"Token，列表示"键"Token。颜色越深表示注意力权重越高。
              </p>
            </div>
          </div>

          <div className="mt-6 rise surface rounded-2xl overflow-hidden border border-[var(--line)] p-6">
            <h3 className="serif text-lg text-ink mb-4">架构说明</h3>
            <div className="space-y-3 text-xs text-ink-3">
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
                <div>
                  <strong className="text-ink">多头注意力 (MHA)</strong>
                  <p>每个 Token 与其他所有 Token 建立连接，计算注意力权重并输出融合上下文的新表示</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                <div>
                  <strong className="text-ink">层归一化 (Norm)</strong>
                  <p>对输入进行归一化处理，稳定训练过程</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 mt-1.5" />
                <div>
                  <strong className="text-ink">前馈网络 (FFN)</strong>
                  <p>对每个 Token 独立进行非线性变换（Position-wise）</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5" style={{ backgroundColor: "#22c55e", borderRadius: "2px" }} />
                <div>
                  <strong className="text-ink">残差连接</strong>
                  <p>用绿色虚线表示：X + SubLayer(X)，原始输入跳过子层直接与输出相加</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rise surface rounded-2xl overflow-hidden border border-[var(--line)] p-6">
            <h3 className="serif text-lg text-ink mb-4">交互提示</h3>
            <ul className="space-y-2 text-xs text-ink-3">
              <li className="flex items-start gap-2">
                <span className="text-[#f4c25a]">●</span>
                <span>悬停在节点上查看连接关系</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#f4c25a]">●</span>
                <span>点击右侧注意力矩阵格子高亮对应连线</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#f4c25a]">●</span>
                <span>开启"残差连接"开关查看跳线</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#f4c25a]">●</span>
                <span>灰色 Token 表示 Padding/Mask 屏蔽</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <Article />
    </div>
  );
}