"use client";

import { useEffect, useState } from "react";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { StreamOutput } from "@/components/stream-output";
import { useStream } from "@/components/use-stream";
import { consumeHandoff } from "@/lib/workflow/handoff";
import { HandoffBanner, SaveToLibrary } from "@/components/workflow/handoff-controls";
import { cn } from "@/lib/utils";

const TOOL = getTool("figure-prompt")!;

const FIGURE_TYPES = [
  { value: "graphical-abstract", label: "图形摘要", sub: "一图概括全文" },
  { value: "workflow", label: "流程示意", sub: "步骤与数据流" },
  { value: "mechanism", label: "机制示意", sub: "作用机理" },
  { value: "experimental-design", label: "实验设计", sub: "分组/时间线" },
  { value: "architecture", label: "模型架构", sub: "模块/数据流" },
  { value: "concept", label: "概念示意", sub: "抽象可视化" },
] as const;

const LAYOUTS = [
  { value: "", label: "自动" },
  { value: "horizontal", label: "横向流程" },
  { value: "vertical", label: "纵向流程" },
  { value: "radial", label: "中心放射" },
  { value: "cycle", label: "环形循环" },
  { value: "grid", label: "分区网格" },
] as const;

const MODELS = [
  { value: "generic", label: "通用" },
  { value: "midjourney", label: "Midjourney" },
  { value: "dalle", label: "DALL·E / GPT" },
  { value: "jimeng", label: "即梦 / 可灵" },
] as const;

const LANGS = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
  { value: "both", label: "中 + 英" },
] as const;

type FigureType = (typeof FIGURE_TYPES)[number]["value"];
type ModelTarget = (typeof MODELS)[number]["value"];
type Lang = (typeof LANGS)[number]["value"];

const fieldBox = cn(
  "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
  "text-[13px] text-ink placeholder:text-ink-4 leading-relaxed",
  "outline-none transition-colors focus:border-line-strong",
);

export default function Page() {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [figureType, setFigureType] = useState<FigureType>("graphical-abstract");
  const [layout, setLayout] = useState<string>("");
  const [palette, setPalette] = useState("");
  const [style, setStyle] = useState("");
  const [model, setModel] = useState<ModelTarget>("generic");
  const [lang, setLang] = useState<Lang>("zh");
  const [handoffFrom, setHandoffFrom] = useState<string | null>(null);
  const [sourcePaperId, setSourcePaperId] = useState<string | null>(null);
  const { text, loading, error, run, stop } = useStream();

  useEffect(() => {
    // 挂载时一次性消费上游 handoff 并水合输入，非级联渲染
    /* eslint-disable react-hooks/set-state-in-effect */
    const h = consumeHandoff("figure-prompt");
    if (!h) return;
    if (h.fields.subject) setSubject(h.fields.subject);
    if (h.fields.content) setContent(h.fields.content);
    if (h.sourcePaperId) setSourcePaperId(h.sourcePaperId);
    setHandoffFrom(h.from);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const submit = () => {
    if (subject.trim().length < 2 || content.trim().length < 5) return;
    run("/api/figure-prompt", {
      subject: subject.trim(),
      content: content.trim(),
      figureType,
      layout,
      palette: palette.trim(),
      style: style.trim(),
      model,
      lang,
    });
  };

  return (
    <ToolShell tool={TOOL}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="surface rounded-[20px] p-6">
          {handoffFrom && (
            <HandoffBanner from={handoffFrom} onDismiss={() => setHandoffFrom(null)} />
          )}

          <label className="overline block mb-2">图类型</label>
          <div className="grid grid-cols-3 gap-2">
            {FIGURE_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setFigureType(t.value)}
                className={cn(
                  "rounded-xl border px-2 py-2.5 text-center transition-all",
                  figureType === t.value
                    ? "border-ink bg-ink text-paper-2"
                    : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                )}
              >
                <div className="serif text-[13.5px] leading-none">{t.label}</div>
                <div className="mt-1 text-[10px] opacity-70">{t.sub}</div>
              </button>
            ))}
          </div>

          <label className="overline block mt-5 mb-2">主题 *</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="例：患者来源肿瘤类器官用于个体化药物筛选"
            className={fieldBox}
          />

          <label className="overline block mt-5 mb-2">要展示的关键内容 / 步骤 *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder="例：从患者肿瘤组织取样 → 组织消化与三维培养形成类器官 → 加入多种候选药物处理 → 高内涵成像与活性检测评估敏感性 → 筛出个体化治疗方案"
            rows={5}
            className={cn(fieldBox, "resize-y")}
          />

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div>
              <label className="overline block mb-2">布局</label>
              <div className="flex flex-wrap gap-1.5">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLayout(l.value)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[12px] transition-all",
                      layout === l.value
                        ? "border-ink bg-ink text-paper-2"
                        : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="overline block mb-2">目标模型</label>
              <div className="flex flex-wrap gap-1.5">
                {MODELS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setModel(m.value)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[12px] transition-all",
                      model === m.value
                        ? "border-ink bg-ink text-paper-2"
                        : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="overline block mt-5 mb-2">
            配色 <span className="normal-case text-ink-4">（可选）</span>
          </label>
          <input
            value={palette}
            onChange={(e) => setPalette(e.target.value)}
            placeholder="留空 = 蓝/浅紫为主色，橙色强调，白底"
            className={fieldBox}
          />

          <label className="overline block mt-5 mb-2">
            额外风格 / 约束 <span className="normal-case text-ink-4">（可选）</span>
          </label>
          <input
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            placeholder="例：扁平等距风、避免拟物阴影、留白充足"
            className={fieldBox}
          />

          <label className="overline block mt-5 mb-2">提示词语言</label>
          <div className="flex flex-wrap gap-1.5">
            {LANGS.map((l) => (
              <button
                key={l.value}
                onClick={() => setLang(l.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[12px] transition-all",
                  lang === l.value
                    ? "border-ink bg-ink text-paper-2"
                    : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>

          <button
            onClick={submit}
            disabled={loading || subject.trim().length < 2 || content.trim().length < 5}
            className={cn(
              "cta-gradient mt-8 w-full rounded-full px-5 py-3 text-[14px] font-medium",
              "transition-all focus-ring disabled:opacity-50 disabled:pointer-events-none",
            )}
          >
            {loading ? "正在生成提示词…" : "生成科研绘图提示词"}
          </button>

          <p className="mt-3 text-[11px] text-ink-3 text-center serif-italic">
            生成可直接粘贴给文生图模型的图形摘要 / 示意图提示词，不替你出图
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <StreamOutput
            text={text}
            loading={loading}
            error={error}
            onRetry={submit}
            onStop={stop}
            emptyHint="填入主题与要展示的内容，生成可直接粘贴的科研绘图提示词。"
          />
          {sourcePaperId && text && !loading && (
            <div className="flex justify-end">
              <SaveToLibrary
                paperId={sourcePaperId}
                field="notes"
                value={text}
                append
                label="回存为研究笔记"
              />
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
}
