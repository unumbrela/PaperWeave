"use client";

import { useState } from "react";
import { Check, Copy, RotateCw, Square, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/markdown";

/** 把后端原始错误归类成可读提示 + 处置建议 */
function friendlyError(raw: string): { title: string; hint?: string } {
  const m = raw.toLowerCase();
  if (/api[_ ]?key|未配置|unauthorized|401|no.*key|缺少密钥/.test(m)) {
    return { title: "AI 服务未配置或密钥无效", hint: "请在 .env.local 配置 DEEPSEEK_API_KEY 后重试。" };
  }
  if (/429|rate|限流|too many/.test(m)) {
    return { title: "请求过于频繁（限流）", hint: "稍候片刻再重试。" };
  }
  if (/timeout|超时|etimedout|network|fetch failed|econnrefused/.test(m)) {
    return { title: "网络异常或请求超时", hint: "检查网络连接后重试。" };
  }
  return { title: raw || "生成失败", hint: "请重试，或稍后再试。" };
}

export function StreamOutput({
  text,
  loading,
  error,
  onRetry,
  onStop,
  emptyHint,
}: {
  text: string;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onStop?: () => void;
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
  const fe = error ? friendlyError(error) : null;

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
            {loading ? (text ? "Generating" : "Thinking") : text ? "Done" : "Idle"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {loading && onStop && (
            <button
              onClick={onStop}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] text-ink-2",
                "hover:text-ink hover:bg-[rgba(26,23,19,0.04)] transition-colors",
              )}
              title="停止生成"
            >
              <Square className="h-3 w-3" />
              <span className="serif-italic">stop</span>
            </button>
          )}
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
        {fe && (
          <div className="rounded-xl border border-[rgba(255,93,77,0.35)] bg-[rgba(255,93,77,0.08)] p-4 text-sm text-[#a53425]">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium">{fe.title}</p>
                {fe.hint && <p className="mt-1 text-[12px] opacity-80">{fe.hint}</p>}
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="mt-3 inline-flex items-center gap-1 rounded-full border border-[rgba(255,93,77,0.4)] px-3 py-1 text-[12px] transition-colors hover:bg-[rgba(255,93,77,0.12)]"
                  >
                    <RotateCw className="h-3 w-3" /> 重试
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {text && <Markdown>{text}</Markdown>}
        {loading && !text && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[12px] text-ink-3">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-plum" />
              <span className="serif-italic">思考中…</span>
            </div>
            <div className="h-3 w-3/4 animate-pulse rounded bg-[rgba(26,23,19,0.06)]" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-[rgba(26,23,19,0.06)]" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-[rgba(26,23,19,0.06)]" />
          </div>
        )}
      </div>
    </div>
  );
}
