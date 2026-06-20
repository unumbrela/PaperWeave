"use client";

import { useEffect, useState } from "react";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { StreamOutput } from "@/components/stream-output";
import { useStream } from "@/components/use-stream";
import { consumeHandoff } from "@/lib/workflow/handoff";
import { HandoffBanner, SaveToLibrary, SendToTool } from "@/components/workflow/handoff-controls";
import { TextField, Textarea, FieldLabel, Button } from "@/components/ui";

const TOOL = getTool("idea-generator")!;

export default function Page() {
  const [direction, setDirection] = useState("");
  const [references, setReferences] = useState("");
  const [baseline, setBaseline] = useState("");
  const [resources, setResources] = useState("");
  const [handoffFrom, setHandoffFrom] = useState<string | null>(null);
  const [sourcePaperId, setSourcePaperId] = useState<string | null>(null);
  const { text, loading, error, run, stop } = useStream();

  useEffect(() => {
    // 挂载时一次性消费上游 handoff 并水合输入，非级联渲染
    /* eslint-disable react-hooks/set-state-in-effect */
    const h = consumeHandoff("idea-generator");
    if (!h) return;
    if (h.fields.direction) setDirection(h.fields.direction);
    if (h.fields.references) setReferences(h.fields.references);
    if (h.fields.baseline) setBaseline(h.fields.baseline);
    if (h.sourcePaperId) setSourcePaperId(h.sourcePaperId);
    setHandoffFrom(h.from);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

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
          {handoffFrom && (
            <HandoffBanner from={handoffFrom} onDismiss={() => setHandoffFrom(null)} />
          )}
          <FieldLabel>研究方向 / 关键词 *</FieldLabel>
          <TextField
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            placeholder="如：扩散模型在 3D 点云生成上的可控性"
          />

          <FieldLabel className="mt-6">参考论文摘要 / 已知工作</FieldLabel>
          <Textarea
            mono
            value={references}
            onChange={(e) => setReferences(e.target.value)}
            placeholder="可从论文库或总结器粘贴 1–N 篇摘要（可选）"
            rows={6}
          />

          <FieldLabel className="mt-6">要打败的 baseline</FieldLabel>
          <TextField
            value={baseline}
            onChange={(e) => setBaseline(e.target.value)}
            placeholder="如：Point-E / 现有 SOTA 方法名（可选）"
          />

          <FieldLabel className="mt-6">可用资源</FieldLabel>
          <TextField
            value={resources}
            onChange={(e) => setResources(e.target.value)}
            placeholder="如：单卡 4090，2 周，公开数据集（可选）"
          />

          <Button
            variant="primary"
            onClick={submit}
            disabled={loading || direction.trim().length < 2}
            className="mt-8 w-full"
          >
            {loading ? "正在生成 idea…" : "生成研究 idea"}
          </Button>

          <p className="mt-3 text-[11px] text-ink-3 text-center serif-italic">
            配 DeepSeek key 时用 deepseek-reasoner 深度推理（可能稍慢）；只配 OpenAI / Gemini 也能生成
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <StreamOutput
            text={text}
            loading={loading}
            error={error}
            onRetry={submit}
            onStop={stop}
            emptyHint="填入研究方向，生成可验证的候选 idea。"
          />
          {text && !loading && (
            <div className="flex flex-wrap justify-end gap-2">
              {sourcePaperId && (
                <SaveToLibrary
                  paperId={sourcePaperId}
                  field="notes"
                  value={text}
                  append
                  label="回存为研究笔记"
                />
              )}
              <SendToTool
                targetSlug="paper-writer"
                payload={{
                  from: TOOL.name,
                  sourcePaperId: sourcePaperId ?? undefined,
                  fields: { topic: direction, innovation: text },
                }}
                label="发往「结构撰写」"
              />
              <SendToTool
                targetSlug="prompt-chunker"
                payload={{
                  from: TOOL.name,
                  sourcePaperId: sourcePaperId ?? undefined,
                  fields: { task: `把下面这个研究 idea 的最小验证实验拆成可执行计划：\n\n${text}` },
                }}
                label="发往「研究任务分解」"
              />
              <SendToTool
                targetSlug="figure-generator"
                payload={{
                  from: TOOL.name,
                  sourcePaperId: sourcePaperId ?? undefined,
                  fields: {
                    description: `为下面这个研究 idea 的最小验证实验设计结果图（先想清楚要传达的结论，再选图型）：\n\n${text}`,
                  },
                }}
                label="为验证实验设计图表"
              />
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
}
