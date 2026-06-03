"use client";

import { useState } from "react";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { StreamOutput } from "@/components/stream-output";
import { useStream } from "@/components/use-stream";
import { cn } from "@/lib/utils";

const TOOL = getTool("explain-code")!;

const LANGS = [
  "自动检测",
  "TypeScript",
  "JavaScript",
  "Python",
  "Go",
  "Rust",
  "Java",
  "C++",
  "SQL",
  "Shell",
] as const;

const GRANULARITY = [
  { value: "overview", label: "整体" },
  { value: "section", label: "逐段" },
  { value: "line", label: "逐行" },
] as const;

export default function Page() {
  const [code, setCode] = useState("");
  const [lang, setLang] = useState<(typeof LANGS)[number]>("自动检测");
  const [granularity, setGranularity] =
    useState<(typeof GRANULARITY)[number]["value"]>("section");
  const [reasoning, setReasoning] = useState(false);
  const { text, loading, error, run, stop } = useStream();

  const submit = () => {
    if (!code.trim()) return;
    run("/api/explain", { code, lang, granularity, reasoning });
  };

  return (
    <ToolShell tool={TOOL}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="surface rounded-[20px] p-6">
          <label className="overline block mb-2">Code</label>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder="// paste code here"
            rows={14}
            className={cn(
              "focus-ring w-full resize-y rounded-xl bg-paper-2/80 border border-line px-4 py-3",
              "font-mono text-[12.5px] leading-relaxed text-ink placeholder:text-ink-4",
              "outline-none transition-colors focus:border-line-strong",
            )}
          />

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <label className="overline block mb-2">语言</label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as typeof lang)}
                className={cn(
                  "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-3 py-2.5",
                  "text-[13px] text-ink",
                  "outline-none focus:border-line-strong",
                )}
              >
                {LANGS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="overline block mb-2">粒度</label>
              <div className="flex items-center rounded-xl border border-line bg-paper-2/60 p-1">
                {GRANULARITY.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setGranularity(g.value)}
                    className={cn(
                      "flex-1 rounded-lg px-2 py-1.5 text-[12px] transition-colors",
                      granularity === g.value
                        ? "bg-ink text-paper-2"
                        : "text-ink-2 hover:text-ink",
                    )}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="mt-5 flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={reasoning}
              onChange={(e) => setReasoning(e.target.checked)}
              className="mt-0.5 accent-plum"
            />
            <span className="text-[12.5px] text-ink-2 leading-relaxed">
              <span className="serif-italic text-ink">deeper</span> 复杂度分析
              <span className="block text-[11px] text-ink-3 mt-0.5">
                切换到 deepseek-reasoner，更慢但更严谨。
              </span>
            </span>
          </label>

          <button
            onClick={submit}
            disabled={loading || !code.trim()}
            className={cn(
              "cta-gradient mt-6 w-full rounded-full px-5 py-3 text-[14px] font-medium",
              "transition-all focus-ring",
            )}
          >
            {loading ? "正在解释…" : "解释这段代码"}
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
          emptyHint="Paste code, press 解释这段代码."
        />
      </div>
    </ToolShell>
  );
}
