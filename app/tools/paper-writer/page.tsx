"use client";

import { useEffect, useState } from "react";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { StreamOutput } from "@/components/stream-output";
import { useStream } from "@/components/use-stream";
import { consumeHandoff } from "@/lib/workflow/handoff";
import { HandoffBanner, SaveToLibrary, SendToTool } from "@/components/workflow/handoff-controls";
import { TextField, Textarea, Select, FieldLabel, Button } from "@/components/ui";

const TOOL = getTool("paper-writer")!;

const VENUE_TYPES = [
  "会议论文（CVPR/NeurIPS/ACL 等）",
  "期刊论文（IEEE/Elsevier 等）",
  "学位论文（硕士 / 博士）",
  "技术报告 / arXiv 预印本",
];

export default function Page() {
  const [topic, setTopic] = useState("");
  const [innovation, setInnovation] = useState("");
  const [references, setReferences] = useState("");
  const [venueType, setVenueType] = useState(VENUE_TYPES[0]);
  const [handoffFrom, setHandoffFrom] = useState<string | null>(null);
  const [sourcePaperId, setSourcePaperId] = useState<string | null>(null);
  const { text, loading, error, run, stop } = useStream();

  useEffect(() => {
    // 挂载时一次性消费上游 handoff 并水合输入，非级联渲染
    /* eslint-disable react-hooks/set-state-in-effect */
    const h = consumeHandoff("paper-writer");
    if (!h) return;
    if (h.fields.topic) setTopic(h.fields.topic);
    if (h.fields.innovation) setInnovation(h.fields.innovation);
    if (h.fields.references) setReferences(h.fields.references);
    if (h.sourcePaperId) setSourcePaperId(h.sourcePaperId);
    setHandoffFrom(h.from);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const submit = () => {
    if (topic.trim().length < 2) return;
    run("/api/paper-writer", {
      topic: topic.trim(),
      innovation: innovation.trim(),
      references: references.trim(),
      venueType,
    });
  };

  return (
    <ToolShell tool={TOOL}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="surface rounded-[20px] p-6">
          {handoffFrom && (
            <HandoffBanner from={handoffFrom} onDismiss={() => setHandoffFrom(null)} />
          )}
          <FieldLabel>论文主题 / 工作标题 *</FieldLabel>
          <TextField
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="如：基于 Mamba 的轻量医学图像小样本分割"
          />

          <FieldLabel className="mt-6">核心创新点 / 贡献</FieldLabel>
          <Textarea
            value={innovation}
            onChange={(e) => setInnovation(e.target.value)}
            placeholder="可从 创新点立论一键流转，或简述你的 1–3 条贡献（可选）"
            rows={4}
          />

          <FieldLabel className="mt-6">参考论文 / 精读产出 / 已有素材</FieldLabel>
          <Textarea
            mono
            value={references}
            onChange={(e) => setReferences(e.target.value)}
            placeholder="可从论文库、对比表或要点提炼粘贴关键工作与要点（可选）"
            rows={6}
          />

          <FieldLabel className="mt-6">目标体例</FieldLabel>
          <Select value={venueType} onChange={(e) => setVenueType(e.target.value)}>
            {VENUE_TYPES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>

          <Button
            variant="primary"
            onClick={submit}
            disabled={loading || topic.trim().length < 2}
            className="mt-8 w-full"
          >
            {loading ? "正在组织结构…" : "组织论文结构"}
          </Button>

          <p className="mt-3 text-[11px] text-ink-3 text-center serif-italic">
            只搭骨架与写作脚手架（大纲 / 要点 / 段落指引），不替你写正文
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <StreamOutput
            text={text}
            loading={loading}
            error={error}
            onRetry={submit}
            onStop={stop}
            emptyHint="填入主题与创新点，生成论文结构与段落脚手架。"
          />
          {text && !loading && (
            <div className="flex flex-wrap justify-end gap-2">
              {sourcePaperId && (
                <SaveToLibrary
                  paperId={sourcePaperId}
                  field="notes"
                  value={text}
                  append
                  label="回存为写作笔记"
                />
              )}
              <SendToTool
                targetSlug="figure-generator"
                payload={{
                  from: TOOL.name,
                  sourcePaperId: sourcePaperId ?? undefined,
                  fields: {
                    description: `为下面这篇论文的实验/方法部分设计配图（先想清楚每张图要传达的结论，再选图型）：\n\n${text}`,
                  },
                }}
                label="为论文设计配图"
              />
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
}
