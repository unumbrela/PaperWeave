"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { StreamOutput } from "@/components/stream-output";
import { SendToTool } from "@/components/workflow/handoff-controls";
import { useStream } from "@/components/use-stream";
import { cn } from "@/lib/utils";

const TOOL = getTool("summarize")!;
const LENGTHS = [
  { value: "short", label: "短", hint: "150 字" },
  { value: "medium", label: "中", hint: "300 字" },
  { value: "long", label: "长", hint: "600 字" },
] as const;

function SummarizeContent() {
  const searchParams = useSearchParams();
  // 从 URL 查询参数派生初始值（链路 handoff 带来的 url），避免在 effect 里
  // 同步 setState 触发级联渲染。
  const [url, setUrl] = useState(() => searchParams.get("url") ?? "");
  const [length, setLength] =
    useState<(typeof LENGTHS)[number]["value"]>("medium");
  const { text, loading, error, run, stop } = useStream();

  const submit = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    run("/api/summarize", { url: trimmed, length });
  };

  return (
    <ToolShell tool={TOOL}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="surface rounded-[20px] p-6">
          <label className="overline block mb-2">URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder="https://example.com/article"
            className={cn(
              "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
              "text-[14px] text-ink placeholder:text-ink-4 font-mono",
              "outline-none transition-colors focus:border-line-strong",
            )}
          />

          <label className="overline block mt-6 mb-2">摘要长度</label>
          <div className="grid grid-cols-3 gap-2">
            {LENGTHS.map((l) => (
              <button
                key={l.value}
                onClick={() => setLength(l.value)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-center transition-all",
                  length === l.value
                    ? "border-ink bg-ink text-paper-2"
                    : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                )}
              >
                <div className="serif text-[18px] leading-none">{l.label}</div>
                <div className="mono text-[10px] mt-1 opacity-70">{l.hint}</div>
              </button>
            ))}
          </div>

          <button
            onClick={submit}
            disabled={loading || !url.trim()}
            className={cn(
              "cta-gradient mt-8 w-full rounded-full px-5 py-3 text-[14px] font-medium",
              "transition-all focus-ring",
            )}
          >
            {loading ? "正在摘要…" : "生成摘要"}
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
            emptyHint="Paste a URL, press 生成摘要."
          />
          {text && !loading && (
            <div className="flex flex-wrap justify-end gap-2">
              <SendToTool
                targetSlug="idea-generator"
                label="发往 创新点立论"
                payload={{
                  from: TOOL.name,
                  fields: { references: text },
                }}
              />
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SummarizeContent />
    </Suspense>
  );
}
