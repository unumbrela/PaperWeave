"use client";

import { useEffect, useState } from "react";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { StreamOutput } from "@/components/stream-output";
import { useStream } from "@/components/use-stream";
import { consumeHandoff } from "@/lib/workflow/handoff";
import { HandoffBanner, SaveToLibrary } from "@/components/workflow/handoff-controls";
import { cn } from "@/lib/utils";

const TOOL = getTool("figure-generator")!;

const LIBRARIES = [
  { value: "matplotlib", label: "matplotlib", sub: "Python 默认" },
  { value: "seaborn", label: "seaborn", sub: "统计图" },
  { value: "plotly", label: "plotly", sub: "可交互" },
  { value: "tikz", label: "TikZ", sub: "LaTeX 原生" },
] as const;

const TARGETS = [
  { value: "single", label: "期刊单栏", sub: "3.5 in" },
  { value: "double", label: "双栏跨栏", sub: "7.0 in" },
  { value: "slide", label: "幻灯片", sub: "16:9" },
] as const;

type Library = (typeof LIBRARIES)[number]["value"];
type Target = (typeof TARGETS)[number]["value"];

export default function Page() {
  const [description, setDescription] = useState("");
  const [data, setData] = useState("");
  const [library, setLibrary] = useState<Library>("matplotlib");
  const [target, setTarget] = useState<Target>("single");
  const [handoffFrom, setHandoffFrom] = useState<string | null>(null);
  const [sourcePaperId, setSourcePaperId] = useState<string | null>(null);
  const { text, loading, error, run, stop } = useStream();

  useEffect(() => {
    // 挂载时一次性消费上游 handoff 并水合输入，非级联渲染
    /* eslint-disable react-hooks/set-state-in-effect */
    const h = consumeHandoff("figure-generator");
    if (!h) return;
    if (h.fields.description) setDescription(h.fields.description);
    if (h.fields.data) setData(h.fields.data);
    if (h.sourcePaperId) setSourcePaperId(h.sourcePaperId);
    setHandoffFrom(h.from);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const submit = () => {
    const trimmed = description.trim();
    if (trimmed.length < 10) return;
    run("/api/figure-generator", {
      description: trimmed,
      data: data.trim(),
      library,
      target,
    });
  };

  return (
    <ToolShell tool={TOOL}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="surface rounded-[20px] p-6">
          {handoffFrom && (
            <HandoffBanner from={handoffFrom} onDismiss={() => setHandoffFrom(null)} />
          )}
          <label className="overline block mb-2">想画什么图</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder="描述图的内容、对比关系、想传达的结论。例：四个方法在三个数据集上的 Dice 对比，突出我们的方法在小目标数据集上的优势…"
            rows={6}
            className={cn(
              "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
              "text-[13px] text-ink placeholder:text-ink-4 leading-relaxed",
              "outline-none transition-colors focus:border-line-strong resize-y",
            )}
          />

          <label className="overline block mt-5 mb-2">
            数据 <span className="normal-case text-ink-4">（可选 · CSV / 表格 / 数字均可）</span>
          </label>
          <textarea
            value={data}
            onChange={(e) => setData(e.target.value)}
            placeholder={"method,dataset,dice\nOurs,ISIC,0.91\nUNet,ISIC,0.87\n…（留空则生成可替换的示例数据段）"}
            rows={5}
            className={cn(
              "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
              "text-[12.5px] text-ink placeholder:text-ink-4 font-mono leading-relaxed",
              "outline-none transition-colors focus:border-line-strong resize-y",
            )}
          />

          <label className="overline block mt-5 mb-2">绘图库</label>
          <div className="grid grid-cols-4 gap-2">
            {LIBRARIES.map((l) => (
              <button
                key={l.value}
                onClick={() => setLibrary(l.value)}
                className={cn(
                  "rounded-xl border px-2 py-2.5 text-center transition-all",
                  library === l.value
                    ? "border-ink bg-ink text-paper-2"
                    : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                )}
              >
                <div className="text-[13px] leading-none">{l.label}</div>
                <div className="mt-1 text-[10px] opacity-70">{l.sub}</div>
              </button>
            ))}
          </div>

          <label className="overline block mt-5 mb-2">排版目标</label>
          <div className="grid grid-cols-3 gap-2">
            {TARGETS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTarget(t.value)}
                className={cn(
                  "rounded-xl border px-2 py-2.5 text-center transition-all",
                  target === t.value
                    ? "border-ink bg-ink text-paper-2"
                    : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                )}
              >
                <div className="serif text-[14px] leading-none">{t.label}</div>
                <div className="mt-1 text-[10px] opacity-70">{t.sub}</div>
              </button>
            ))}
          </div>

          <button
            onClick={submit}
            disabled={loading || description.trim().length < 10}
            className={cn(
              "cta-gradient mt-8 w-full rounded-full px-5 py-3 text-[14px] font-medium",
              "transition-all focus-ring",
            )}
          >
            {loading ? "正在生成…" : "生成绘图代码"}
          </button>

          <p className="mt-3 text-[11px] text-ink-3 text-center">
            <kbd>⌘</kbd>
            <span className="mx-1">/</span>
            <kbd>Ctrl</kbd>
            <span className="mx-1">+</span>
            <kbd>Enter</kbd>
            <span className="ml-2 serif-italic">submit</span>
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <StreamOutput
            text={text}
            loading={loading}
            error={error}
            onRetry={submit}
            onStop={stop}
            emptyHint="描述想画的图（可附数据），生成可直接运行的出版级绘图代码。"
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
