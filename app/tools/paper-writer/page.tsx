"use client";

import { useEffect, useState } from "react";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { StreamOutput } from "@/components/stream-output";
import { useStream } from "@/components/use-stream";
import { Markdown } from "@/components/markdown";
import { consumeHandoff } from "@/lib/workflow/handoff";
import { HandoffBanner, SaveToLibrary, SendToTool } from "@/components/workflow/handoff-controls";
import { TextField, Textarea, Select, FieldLabel, Button } from "@/components/ui";
import { PAPER_WRITER_EXAMPLE } from "@/lib/paper-writer/example";
import {
  INTRO_STORYLINE,
  WRITING_PRINCIPLES,
  SIGNPOSTS,
  SECTION_MOVES,
  SOURCES,
} from "@/lib/paper-writer/methodology";
import { cn } from "@/lib/utils";

const TOOL = getTool("paper-writer")!;

const VENUE_TYPES = [
  "会议论文（CVPR/NeurIPS/ACL 等）",
  "期刊论文（IEEE/Elsevier 等）",
  "学位论文（硕士 / 博士）",
  "技术报告 / arXiv 预印本",
];

// 章节词表（value 与 app/api/paper-writer/route.ts 的 SECTION_LABELS 对齐）。
const SECTIONS = [
  { value: "abstract", label: "Abstract", sub: "摘要" },
  { value: "intro", label: "Introduction", sub: "引言" },
  { value: "related", label: "Related Work", sub: "相关工作" },
  { value: "method", label: "Method", sub: "方法" },
  { value: "experiments", label: "Experiments", sub: "实验" },
  { value: "conclusion", label: "Conclusion", sub: "结论" },
] as const;

const LANGS = [
  { value: "zh-en", label: "中文 + 英文模板" },
  { value: "zh", label: "仅中文" },
  { value: "both", label: "中英双语" },
] as const;

type Lang = (typeof LANGS)[number]["value"];

const SECTION_LABEL: Record<string, string> = Object.fromEntries(
  SECTIONS.map((s) => [s.value, `${s.label} ${s.sub}`]),
);

// 示例输入还原（与 figure-prompt 的 recap 一致的展示行）。
const EXAMPLE_RECAP: { label: string; value: string }[] = [
  { label: "论文主题", value: PAPER_WRITER_EXAMPLE.topic },
  { label: "核心创新点", value: PAPER_WRITER_EXAMPLE.innovation },
  { label: "参考素材", value: PAPER_WRITER_EXAMPLE.references },
  { label: "目标体例", value: PAPER_WRITER_EXAMPLE.venueType },
  {
    label: "章节范围",
    value: PAPER_WRITER_EXAMPLE.sections.map((s) => SECTION_LABEL[s] ?? s).join(" · "),
  },
  { label: "目标读者", value: PAPER_WRITER_EXAMPLE.audience },
  {
    label: "语言",
    value: LANGS.find((l) => l.value === PAPER_WRITER_EXAMPLE.language)?.label ?? "",
  },
];

export default function Page() {
  const [topic, setTopic] = useState("");
  const [innovation, setInnovation] = useState("");
  const [references, setReferences] = useState("");
  const [venueType, setVenueType] = useState(VENUE_TYPES[0]);
  const [sections, setSections] = useState<string[]>([]);
  const [audience, setAudience] = useState("");
  const [language, setLanguage] = useState<Lang>("zh-en");
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

  const toggleSection = (v: string) =>
    setSections((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const submit = () => {
    if (topic.trim().length < 2) return;
    run("/api/paper-writer", {
      topic: topic.trim(),
      innovation: innovation.trim(),
      references: references.trim(),
      venueType,
      sections,
      audience: audience.trim(),
      language,
    });
  };

  const applyExample = () => {
    setTopic(PAPER_WRITER_EXAMPLE.topic);
    setInnovation(PAPER_WRITER_EXAMPLE.innovation);
    setReferences(PAPER_WRITER_EXAMPLE.references);
    setVenueType(PAPER_WRITER_EXAMPLE.venueType);
    setSections([...PAPER_WRITER_EXAMPLE.sections]);
    setAudience(PAPER_WRITER_EXAMPLE.audience);
    setLanguage(PAPER_WRITER_EXAMPLE.language);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onlyOne = sections.length === 1;

  return (
    <ToolShell tool={TOOL}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-stretch">
        <div className="surface rounded-[20px] p-6 h-full">
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

          <FieldLabel
            className="mt-6"
            hint={onlyOne ? "只选一节 = 单节精修（更细）" : "不选 = 覆盖全部章节"}
          >
            章节范围
          </FieldLabel>
          <div className="grid grid-cols-3 gap-2">
            {SECTIONS.map((s) => {
              const on = sections.includes(s.value);
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => toggleSection(s.value)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-center transition-all",
                    on
                      ? "border-ink bg-ink text-paper-2"
                      : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                  )}
                >
                  <div className="serif text-[13px] leading-none">{s.label}</div>
                  <div className="mt-1 text-[10px] opacity-70">{s.sub}</div>
                </button>
              );
            })}
          </div>

          <FieldLabel className="mt-6" hint="可选">
            目标读者 / 审稿关注
          </FieldLabel>
          <TextField
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="如：CV / 医学影像审稿人，关注效率与标注成本"
          />

          <FieldLabel className="mt-6">脚手架语言</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {LANGS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLanguage(l.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[12px] transition-all",
                  language === l.value
                    ? "border-ink bg-ink text-paper-2"
                    : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>

          <Button
            variant="primary"
            onClick={submit}
            disabled={loading || topic.trim().length < 2}
            className="mt-8 w-full"
          >
            {loading ? "正在组织结构…" : onlyOne ? "精修该节" : "组织论文结构"}
          </Button>

          <p className="mt-3 text-[11px] text-ink-3 text-center serif-italic">
            只搭骨架与写作脚手架（大纲 / 要点 / 段落主题句意图 / 英文模板），不替你写正文
          </p>
        </div>

        <div className="flex flex-col gap-3 h-full">
          <StreamOutput
            text={text}
            loading={loading}
            error={error}
            onRetry={submit}
            onStop={stop}
            emptyHint="填入主题与创新点，生成论文结构与段落脚手架。"
            className="flex-1"
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
                targetSlug="figure-prompt"
                payload={{
                  from: TOOL.name,
                  sourcePaperId: sourcePaperId ?? undefined,
                  fields: {
                    content: `为下面这篇论文的方法/实验部分设计配图（先想清楚每张图要传达的结论，再选图型）：\n\n${text}`,
                  },
                }}
                label="为论文设计配图"
              />
            </div>
          )}
        </div>
      </div>

      {/* 端到端示例：输入还原 → 生成的结构脚手架 */}
      <section className="mt-14">
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <div className="overline mb-1" style={{ color: "#ec4899" }}>
              example · 一键填入
            </div>
            <h2 className="serif text-[30px] leading-tight text-ink">
              先看一个完整示例
              <span className="serif-italic text-ink-3">, 从输入到结构脚手架.</span>
            </h2>
          </div>
          <Button variant="outline" onClick={applyExample}>
            载入示例到输入区
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start">
          <div className="surface rounded-[20px] p-6">
            <div className="overline mb-3">输入还原</div>
            <dl className="space-y-3">
              {EXAMPLE_RECAP.map((r) => (
                <div key={r.label}>
                  <dt className="text-[11px] text-ink-3">{r.label}</dt>
                  <dd className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="surface rounded-[20px] p-6">
            <div className="overline mb-3">生成的结构脚手架（节选）</div>
            <Markdown>{PAPER_WRITER_EXAMPLE.output}</Markdown>
          </div>
        </div>
      </section>

      {/* 写作方法论参考面板（折叠）—— 让产出依据看得见 */}
      <section className="mt-14">
        <details className="surface rounded-[20px] p-6">
          <summary className="cursor-pointer list-none">
            <span className="serif text-[22px] text-ink">写作方法论</span>
            <span className="serif-italic text-ink-3 text-[18px]"> · 产出背后的依据</span>
            <span className="overline ml-3 align-middle text-ink-3">展开 / 收起</span>
          </summary>

          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <div>
              <div className="overline mb-3">Introduction 四段式故事线</div>
              <ol className="space-y-3">
                {INTRO_STORYLINE.map((s) => (
                  <li key={s.stage} className="text-[13px] leading-relaxed">
                    <div className="font-medium text-ink">{s.stage}</div>
                    <div className="text-ink-2">{s.intent}</div>
                    <div className="mt-0.5 text-[12px] text-ink-3">坑：{s.pitfall}</div>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <div className="overline mb-3">英语科技写作原则</div>
              <ul className="space-y-3">
                {WRITING_PRINCIPLES.map((p) => (
                  <li key={p.name} className="text-[13px] leading-relaxed">
                    <div className="font-medium text-ink">{p.name}</div>
                    <div className="text-ink-2">{p.rule}</div>
                    <div className="mt-0.5 text-[12px] text-ink-3">{p.example}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="overline mb-3">过渡 / 连接词</div>
              <ul className="space-y-2">
                {SIGNPOSTS.map((g) => (
                  <li key={g.relation} className="text-[13px] leading-relaxed">
                    <span className="font-medium text-ink">{g.relation}</span>
                    <span className="text-ink-3">（{g.zh}）：</span>
                    <span className="text-ink-2">{g.en.join(" · ")}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="overline mb-3">各章节写作动作 + 审稿关注</div>
              <ul className="space-y-3">
                {SECTION_MOVES.map((m) => (
                  <li key={m.section} className="text-[13px] leading-relaxed">
                    <div className="font-medium text-ink">{m.section}</div>
                    <div className="text-ink-2">{m.moves.join("；")}</div>
                    <div className="mt-0.5 text-[12px] text-ink-3">审稿关注：{m.reviewerFocus}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-line pt-4">
            <div className="overline mb-2">参考来源</div>
            <ul className="space-y-1.5">
              {SOURCES.map((s) => (
                <li key={s.label} className="text-[12px] leading-relaxed text-ink-3">
                  {"url" in s && s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink-2 underline underline-offset-2 hover:text-ink"
                    >
                      {s.label}
                    </a>
                  ) : (
                    <span className="text-ink-2">{s.label}</span>
                  )}
                  —— {s.note}
                </li>
              ))}
            </ul>
          </div>
        </details>
      </section>
    </ToolShell>
  );
}
