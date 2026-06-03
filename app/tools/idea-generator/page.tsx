"use client";

import { useState } from "react";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { StreamOutput } from "@/components/stream-output";
import { useStream } from "@/components/use-stream";
import { cn } from "@/lib/utils";

const TOOL = getTool("idea-generator")!;

const inputCls = cn(
  "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
  "text-[13px] text-ink placeholder:text-ink-4 outline-none transition-colors focus:border-line-strong",
);

export default function Page() {
  const [direction, setDirection] = useState("");
  const [references, setReferences] = useState("");
  const [baseline, setBaseline] = useState("");
  const [resources, setResources] = useState("");
  const { text, loading, error, run } = useStream();

  const submit = () => {
    if (direction.trim().length < 2) return;
    run("/api/idea-generator", {
      direction: direction.trim(),
      references: references.trim(),
      baseline: baseline.trim(),
      resources: resources.trim(),
    });
  };

  return (
    <ToolShell tool={TOOL}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="surface rounded-[20px] p-6">
          <label className="overline block mb-2">研究方向 / 关键词 *</label>
          <input
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            placeholder="如：扩散模型在 3D 点云生成上的可控性"
            className={inputCls}
          />

          <label className="overline block mt-6 mb-2">参考论文摘要 / 已知工作</label>
          <textarea
            value={references}
            onChange={(e) => setReferences(e.target.value)}
            placeholder="可从论文库或总结器粘贴 1–N 篇摘要（可选）"
            rows={6}
            className={cn(inputCls, "font-mono leading-relaxed resize-y")}
          />

          <label className="overline block mt-6 mb-2">要打败的 baseline</label>
          <input
            value={baseline}
            onChange={(e) => setBaseline(e.target.value)}
            placeholder="如：Point-E / 现有 SOTA 方法名（可选）"
            className={inputCls}
          />

          <label className="overline block mt-6 mb-2">可用资源</label>
          <input
            value={resources}
            onChange={(e) => setResources(e.target.value)}
            placeholder="如：单卡 4090，2 周，公开数据集（可选）"
            className={inputCls}
          />

          <button
            onClick={submit}
            disabled={loading || direction.trim().length < 2}
            className={cn(
              "cta-gradient mt-8 w-full rounded-full px-5 py-3 text-[14px] font-medium",
              "transition-all focus-ring",
            )}
          >
            {loading ? "正在生成 idea…" : "生成研究 idea"}
          </button>

          <p className="mt-3 text-[11px] text-ink-3 text-center serif-italic">
            用 deepseek-reasoner 深度推理，可能稍慢
          </p>
        </div>

        <StreamOutput
          text={text}
          loading={loading}
          error={error}
          onRetry={submit}
          emptyHint="填入研究方向，生成可验证的候选 idea。"
        />
      </div>
    </ToolShell>
  );
}
