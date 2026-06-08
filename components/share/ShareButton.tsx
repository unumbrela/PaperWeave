"use client";

import { useEffect, useRef, useState } from "react";
import { Share2, Loader2, Copy, Check, X } from "lucide-react";
import { shareUrl, type ShareSnapshot } from "@/lib/share/snapshot";
import { cn } from "@/lib/utils";

/**
 * 只读分享按钮 —— 挂载时探测分享是否启用（服务端配了 service-role 才显示）。
 * 点击时由 `build()` 现场构造快照 → POST 创建 → 弹出可复制的公开链接。
 */
export function ShareButton({
  build,
  label = "分享",
  className,
}: {
  build: () => Promise<ShareSnapshot>;
  label?: string;
  className?: string;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/share/status")
      .then((r) => r.json())
      .then((d) => setEnabled(!!d.enabled))
      .catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    if (!url) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setUrl(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [url]);

  // 未启用时整体不渲染，保持「零配置无痕」
  if (!enabled) return null;

  const handleShare = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const snapshot = await build();
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "创建分享失败");
      setUrl(shareUrl(window.location.origin, data.token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "分享失败");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleShare}
        disabled={busy}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-line bg-paper-2/80 px-3 py-1.5 text-sm text-ink-2 transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50 focus-ring",
          className,
        )}
        title="生成只读分享链接"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
        {label}
      </button>

      {error && <span className="ml-2 text-[12px] text-coral">{error}</span>}

      {url && (
        <div className="absolute right-0 z-40 mt-2 w-[320px] rounded-xl border border-line bg-paper-2 p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="overline text-ink-3">只读分享链接</span>
            <button onClick={() => setUrl(null)} className="text-ink-4 hover:text-ink">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-line bg-paper-3/60 px-2 py-1.5">
            <span className="flex-1 truncate text-[12px] text-ink-2">{url}</span>
            <button
              onClick={copy}
              className="shrink-0 rounded p-1 text-ink-4 transition-colors hover:bg-paper-2 hover:text-ink"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-sage" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-ink-4">任何人可凭此链接只读查看（30 天有效）。</p>
        </div>
      )}
    </div>
  );
}
