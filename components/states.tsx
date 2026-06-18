"use client";

import { AlertTriangle, RotateCw, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** 加载态：骨架卡片网格（替代白屏） */
export function LoadingState({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="surface rounded-2xl border border-line p-5"
          aria-hidden
        >
          <div className="mb-3 h-3 w-1/3 animate-pulse rounded bg-[rgba(26,23,19,0.06)]" />
          <div className="mb-2 h-4 w-5/6 animate-pulse rounded bg-[rgba(26,23,19,0.06)]" />
          <div className="mb-4 h-4 w-2/3 animate-pulse rounded bg-[rgba(26,23,19,0.06)]" />
          <div className="h-3 w-full animate-pulse rounded bg-[rgba(26,23,19,0.05)]" />
        </div>
      ))}
    </div>
  );
}

/** 行内加载态（小尺寸，用于详情/区块） */
export function InlineLoading({ label = "加载中…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-3">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

/** 整页居中加载态（替代各页裸 coral spinner，统一为编辑风眉标 + 旋转） */
export function CenteredLoading({
  label = "加载中…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex h-full min-h-[60vh] flex-col items-center justify-center", className)}>
      <div className="mb-4 h-7 w-7 animate-spin rounded-full border-2 border-coral border-t-transparent" />
      <p className="overline text-ink-3">{label}</p>
    </div>
  );
}

/** 骨架块 —— 编辑风占位（呼应 StreamOutput 的 pulse 行），可拼装行/卡。 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-[rgba(26,23,19,0.06)]", className)} aria-hidden />;
}

/** 多行文本骨架 */
export function SkeletonLines({ lines = 3, className }: { lines?: number; className?: string }) {
  const widths = ["w-5/6", "w-full", "w-2/3", "w-3/4", "w-4/5"];
  return (
    <div className={cn("space-y-3", className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3", widths[i % widths.length])} />
      ))}
    </div>
  );
}

/** 空态 */
export function EmptyState({
  icon,
  title,
  hint,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-paper-2/40 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="mb-4 text-ink-3">{icon ?? <Inbox className="h-10 w-10" />}</div>
      <h3 className="serif text-[18px] text-ink">{title}</h3>
      {hint && <p className="mt-2 max-w-sm text-[13px] text-ink-3 leading-relaxed">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** 错误态：可读提示 + 重试 */
export function ErrorState({
  title = "出错了",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-[rgba(255,93,77,0.3)] bg-[rgba(255,93,77,0.06)] px-6 py-14 text-center",
        className,
      )}
    >
      <AlertTriangle className="mb-3 h-8 w-8 text-[#c0442f]" />
      <h3 className="font-medium text-[#a53425]">{title}</h3>
      {message && <p className="mt-2 max-w-sm text-[13px] text-[#a53425]/80 leading-relaxed">{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,93,77,0.4)] px-4 py-2 text-[13px] text-[#a53425] transition-colors hover:bg-[rgba(255,93,77,0.12)]"
        >
          <RotateCw className="h-3.5 w-3.5" /> 重试
        </button>
      )}
    </div>
  );
}
