"use client";

import { useState } from "react";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { StreamOutput } from "@/components/stream-output";
import { useStream } from "@/components/use-stream";
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
  const { text, loading, error, run } = useStream();

  const submit = () => {
    const trimmed = markdown.trim();
    if (trimmed.length < 40) return;
    run("/api/markdown-summarize", { markdown: trimmed, focus });
  };

  return (
    <ToolShell tool={TOOL}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="surface rounded-[20px] p-6">
          <label className="overline block mb-2">论文 Markdown</label>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder="粘贴论文 Markdown（通常来自「论文资料整理器」的输出）…"
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
            {loading ? "正在总结…" : "结构化总结"}
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

        <StreamOutput
          text={text}
          loading={loading}
          error={error}
          onRetry={submit}
          emptyHint="粘贴论文 Markdown，点击结构化总结。"
        />
      </div>
    </ToolShell>
  );
}
