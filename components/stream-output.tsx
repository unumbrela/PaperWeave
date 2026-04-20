"use client";

import { useState } from "react";
import { Check, Copy, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/markdown";

export function StreamOutput({
  text,
  loading,
  error,
  onRetry,
  emptyHint,
}: {
  text: string;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyHint?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const showEmpty = !loading && !error && !text;

  return (
    <div className="surface rounded-[20px] min-h-[320px] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              loading
                ? "bg-plum animate-pulse"
                : text
                  ? "bg-[var(--sage)]"
                  : "bg-ink-4",
            )}
          />
          <span className="overline">
            {loading ? "Generating" : text ? "Done" : "Idle"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={loading || !text}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] text-ink-2",
                "hover:text-ink hover:bg-[rgba(26,23,19,0.04)] transition-colors",
                "disabled:opacity-40 disabled:pointer-events-none",
              )}
              title="重新生成"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span className="serif-italic">retry</span>
            </button>
          )}
          <button
            onClick={copy}
            disabled={!text}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] text-ink-2",
              "hover:text-ink hover:bg-[rgba(26,23,19,0.04)] transition-colors",
              "disabled:opacity-40 disabled:pointer-events-none",
            )}
            title="复制"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-[var(--sage)]" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span className="serif-italic">{copied ? "copied" : "copy"}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 py-5 overflow-auto">
        {showEmpty && (
          <div className="flex h-full min-h-[240px] items-center justify-center text-center">
            <p className="serif-italic text-[22px] text-ink-3 max-w-xs leading-snug">
              {emptyHint ?? "Results will appear here."}
            </p>
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-[rgba(255,93,77,0.35)] bg-[rgba(255,93,77,0.08)] p-3 text-sm text-[#a53425]">
            {error}
          </div>
        )}
        {text && <Markdown>{text}</Markdown>}
        {loading && !text && (
          <div className="space-y-3">
            <div className="h-3 w-3/4 animate-pulse rounded bg-[rgba(26,23,19,0.06)]" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-[rgba(26,23,19,0.06)]" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-[rgba(26,23,19,0.06)]" />
          </div>
        )}
      </div>
    </div>
  );
}
