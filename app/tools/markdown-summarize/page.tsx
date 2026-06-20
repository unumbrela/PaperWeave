"use client";

import { useEffect, useState } from "react";
import { Library, Loader2 } from "lucide-react";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { StreamOutput } from "@/components/stream-output";
import { useStream } from "@/components/use-stream";
import { consumeHandoff } from "@/lib/workflow/handoff";
import { HandoffBanner, SendToTool, SaveToLibrary } from "@/components/workflow/handoff-controls";
import { repository } from "@/lib/db/repository";
import type { Paper } from "@/lib/db/types";
import { cn } from "@/lib/utils";

const TOOL = getTool("markdown-summarize")!;

const FOCUS = [
  { value: "balanced", label: "均衡" },
  { value: "method", label: "偏方法" },
  { value: "experiment", label: "偏实验" },
  { value: "related", label: "偏综述" },
] as const;

export default function Page() {
  const [markdown, setMarkdown] = useState("");
  const [focus, setFocus] = useState<(typeof FOCUS)[number]["value"]>("balanced");
  const [handoffFrom, setHandoffFrom] = useState<string | null>(null);
  const [sourcePaperId, setSourcePaperId] = useState<string | null>(null);
  const [libPapers, setLibPapers] = useState<Paper[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadingLib, setLoadingLib] = useState(false);
  const { text, loading, error, run, stop } = useStream();

  // 从论文库选篇：首次打开时懒加载列表（本地 Dexie）。
  const togglePicker = async () => {
    const next = !pickerOpen;
    setPickerOpen(next);
    if (next && libPapers === null) {
      setLoadingLib(true);
      try {
        setLibPapers(await repository.listPapers());
      } catch {
        setLibPapers([]);
      } finally {
        setLoadingLib(false);
      }
    }
  };

  // 选中一篇：把标题 + 摘要（+ 已有速览）带入输入框（库内无全文，以摘要起步）。
  const pickPaper = (p: Paper) => {
    const parts = [`# ${p.title}`];
    if (p.abstract) parts.push(p.abstract);
    if (p.summary) parts.push(`## 已有速览\n\n${p.summary}`);
    setMarkdown(parts.join("\n\n"));
    setSourcePaperId(p.id);
    setPickerOpen(false);
  };

  useEffect(() => {
    // 挂载时一次性消费上游 handoff 并水合输入，非级联渲染
    /* eslint-disable react-hooks/set-state-in-effect */
    const h = consumeHandoff("markdown-summarize");
    if (!h) return;
    if (h.fields.markdown) setMarkdown(h.fields.markdown);
    if (h.sourcePaperId) setSourcePaperId(h.sourcePaperId);
    setHandoffFrom(h.from);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const submit = () => {
    const trimmed = markdown.trim();
    if (trimmed.length < 40) return;
    run("/api/markdown-summarize", { markdown: trimmed, focus });
  };

  return (
    <ToolShell tool={TOOL}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="surface rounded-[20px] p-6">
          {handoffFrom && (
            <HandoffBanner from={handoffFrom} onDismiss={() => setHandoffFrom(null)} />
          )}
          <div className="mb-2 flex items-center justify-between">
            <label className="overline">论文 Markdown</label>
            <button
              onClick={togglePicker}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-all",
                pickerOpen
                  ? "border-plum/50 bg-plum/10 text-plum"
                  : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
              )}
            >
              {loadingLib ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Library className="h-3.5 w-3.5" />}
              从论文库选篇
            </button>
          </div>

          {pickerOpen && (
            <div className="mb-3 max-h-56 overflow-y-auto rounded-xl border border-line bg-paper-2/60 p-1.5">
              {loadingLib ? (
                <p className="px-2 py-3 text-center text-[12px] text-ink-3">读取论文库…</p>
              ) : libPapers && libPapers.length > 0 ? (
                libPapers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => pickPaper(p)}
                    className="block w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-paper-3"
                  >
                    <div className="line-clamp-1 text-[13px] text-ink">{p.title}</div>
                    <div className="mt-0.5 line-clamp-1 text-[11px] text-ink-4">
                      {p.abstract ? p.abstract.slice(0, 90) : "（无摘要）"}
                    </div>
                  </button>
                ))
              ) : (
                <p className="px-2 py-3 text-center text-[12px] text-ink-3">
                  论文库还是空的——先去「调研搜索」入库几篇。
                </p>
              )}
            </div>
          )}
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder="粘贴论文 Markdown（通常来自「文献格式转译」的输出）…"
            rows={14}
            className={cn(
              "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
              "text-[13px] text-ink placeholder:text-ink-4 font-mono leading-relaxed",
              "outline-none transition-colors focus:border-line-strong resize-y",
            )}
          />

          <label className="overline block mt-6 mb-2">提取侧重</label>
          <div className="grid grid-cols-4 gap-2">
            {FOCUS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFocus(f.value)}
                className={cn(
                  "rounded-xl border px-2 py-2.5 text-center transition-all",
                  focus === f.value
                    ? "border-ink bg-ink text-paper-2"
                    : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                )}
              >
                <div className="serif text-[14px] leading-none">{f.label}</div>
              </button>
            ))}
          </div>

          <button
            onClick={submit}
            disabled={loading || markdown.trim().length < 40}
            className={cn(
              "cta-gradient mt-8 w-full rounded-full px-5 py-3 text-[14px] font-medium",
              "transition-all focus-ring",
            )}
          >
            {loading ? "正在总结…" : "要点提炼"}
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
            emptyHint="粘贴论文 Markdown，点击要点提炼。"
          />
          {text && !loading && (
            <div className="flex flex-wrap justify-end gap-2">
              {sourcePaperId && (
                <SaveToLibrary
                  paperId={sourcePaperId}
                  field="summary"
                  value={text}
                  label="回存为论文总结"
                />
              )}
              <SendToTool
                targetSlug="idea-generator"
                payload={{
                  from: TOOL.name,
                  sourcePaperId: sourcePaperId ?? undefined,
                  fields: { references: text },
                }}
                label="把总结发往「创新点立论」"
              />
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
}
