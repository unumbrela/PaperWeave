"use client";

import { useState } from "react";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { StreamOutput } from "@/components/stream-output";
import { useStream } from "@/components/use-stream";
import { cn } from "@/lib/utils";

const TOOL = getTool("optimize-prompt")!;

const TARGETS = [
  { value: "chat", label: "对话", sub: "chat" },
  { value: "code", label: "代码", sub: "code" },
  { value: "image", label: "图像", sub: "image" },
] as const;

export default function Page() {
  const [prompt, setPrompt] = useState("");
  const [target, setTarget] =
    useState<(typeof TARGETS)[number]["value"]>("chat");
  const { text, loading, error, run, stop } = useStream();

  const submit = () => {
    if (!prompt.trim()) return;
    run("/api/optimize", { prompt, target });
  };

  return (
    <ToolShell tool={TOOL}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="surface rounded-[20px] p-6">
          <label className="overline block mb-2">原始 Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder="写一段你想优化的 prompt…"
            rows={12}
            className={cn(
              "focus-ring w-full resize-y rounded-xl bg-paper-2/80 border border-line px-4 py-3",
              "text-[13.5px] leading-relaxed text-ink placeholder:text-ink-4",
              "outline-none transition-colors focus:border-line-strong",
            )}
          />

          <label className="overline block mt-5 mb-2">目标模型</label>
          <div className="grid grid-cols-3 gap-2">
            {TARGETS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTarget(t.value)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-center transition-all",
                  target === t.value
                    ? "border-ink bg-ink text-paper-2"
                    : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                )}
              >
                <div className="serif text-[18px] leading-none">{t.label}</div>
                <div className="mono text-[10px] mt-1 opacity-70">{t.sub}</div>
              </button>
            ))}
          </div>

          <button
            onClick={submit}
            disabled={loading || !prompt.trim()}
            className={cn(
              "cta-gradient mt-8 w-full rounded-full px-5 py-3 text-[14px] font-medium",
              "transition-all focus-ring",
            )}
          >
            {loading ? "正在优化…" : "优化 Prompt"}
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
          onStop={stop}
          emptyHint="Paste a prompt, press 优化 Prompt."
        />
      </div>
    </ToolShell>
  );
}
