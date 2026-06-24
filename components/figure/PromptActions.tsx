"use client";

import { useEffect, useState } from "react";
import { Copy, Check, ExternalLink, Sparkles, Download, Loader2, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { extractFigurePrompt, IMAGE_PLATFORMS } from "@/lib/figure/prompt";
import { getUserKeys, setUserKeys } from "@/lib/ai/user-keys";

/**
 * 提示词「下一步」面板：拿到生成的提示词后——
 *  ① 一键复制 + 直达主流文生图平台（ChatGPT 实测最佳）粘贴出图；
 *  ② 自带 ZenMux key 在本页直接调 GPT-image 2 出图、预览并下载。
 */

const SIZES = [
  { value: "1536x1024", label: "横向 3:2" },
  { value: "1024x1024", label: "方形 1:1" },
  { value: "1024x1536", label: "纵向 2:3" },
] as const;

export function PromptActions({ text }: { text: string }) {
  const prompt = extractFigurePrompt(text);

  const [copied, setCopied] = useState(false);
  const [zenmuxKey, setZenmuxKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [size, setSize] = useState<string>("1536x1024");
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  // 挂载时水合已保存的 ZenMux key（localStorage 仅客户端可读）
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setZenmuxKey(getUserKeys().zenmux || "");
  }, []);

  const flashCopied = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    flashCopied();
  };

  const openPlatform = async (url: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      flashCopied();
    } catch {
      /* 剪贴板不可用也照常打开平台 */
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const genImage = async () => {
    const key = zenmuxKey.trim();
    if (!key || !prompt) return;
    // 顺手把 key 持久化，供全站其它 AI 调用复用
    setUserKeys({ ...getUserKeys(), zenmux: key });
    setImgLoading(true);
    setImgError(null);
    setImgUrl(null);
    try {
      const res = await fetch("/api/figure-image", {
        method: "POST",
        headers: { "content-type": "application/json", "x-zenmux-key": key },
        body: JSON.stringify({ prompt, size }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `生成失败 (${res.status})`);
      }
      const data = (await res.json()) as { image: string };
      setImgUrl(data.image);
    } catch (e) {
      setImgError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setImgLoading(false);
    }
  };

  if (!prompt) return null;

  return (
    <div className="surface rounded-[20px] p-6">
      <div className="overline mb-1">下一步 · 用这条提示词出图</div>
      <p className="text-[12px] text-ink-3 serif-italic mb-4">
        复制后到任一平台粘贴生成 —— ChatGPT（GPT-image）实测效果最佳；或自带 ZenMux key 在本页直接出图。
      </p>

      {/* ① 复制 + 平台直达 */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" size="sm" onClick={copy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "已复制" : "复制提示词"}
        </Button>
        {IMAGE_PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => openPlatform(p.url)}
            title={p.hint}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] transition-all",
              p.recommended
                ? "border-[#f59e0b] text-[#b8770b] bg-[#f59e0b]/5 hover:bg-[#f59e0b]/10"
                : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
            )}
          >
            {p.label}
            {p.recommended && <span className="text-[10px] opacity-80">· 推荐</span>}
            <ExternalLink className="h-3 w-3 opacity-60" />
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-4">点平台按钮会自动复制提示词并在新标签打开，去粘贴即可。</p>

      {/* ② 本页直接出图（ZenMux · GPT-image 2） */}
      <div className="hairline my-5" />
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-ink-3" />
        <span className="overline">在本页直接生成（ZenMux · GPT-image 2）</span>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
          <input
            type={showKey ? "text" : "password"}
            value={zenmuxKey}
            onChange={(e) => setZenmuxKey(e.target.value)}
            placeholder="ZenMux API Key（sk-ai-...）"
            autoComplete="off"
            className={cn(
              "focus-ring w-full rounded-xl bg-paper-2/80 border border-line pl-9 pr-14 py-2.5",
              "text-[13px] text-ink placeholder:text-ink-4 outline-none transition-colors focus:border-line-strong",
            )}
          />
          <button
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-ink-4 hover:text-ink-2"
            type="button"
          >
            {showKey ? "隐藏" : "显示"}
          </button>
        </div>
        <div className="flex gap-1.5">
          {SIZES.map((s) => (
            <button
              key={s.value}
              onClick={() => setSize(s.value)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[12px] transition-all",
                size === s.value
                  ? "border-ink bg-ink text-paper-2"
                  : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <Button
        variant="primary"
        size="md"
        onClick={genImage}
        disabled={imgLoading || !zenmuxKey.trim()}
        className="mt-3 w-full"
      >
        {imgLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {imgLoading ? "正在调用 GPT-image 2 出图…（约 20–60 秒）" : "用 GPT-image 2 生成图片"}
      </Button>
      <p className="mt-2 text-[11px] text-ink-4">
        key 仅存于你的浏览器、随请求直传 ZenMux，不在我们的服务器留存。出图按 ZenMux 用量计费。
      </p>

      {imgError && (
        <p className="mt-3 rounded-xl border border-[#e7c3bd] bg-[#fbeae7] px-3 py-2 text-[12px] text-[#a53425]">
          {imgError}
        </p>
      )}

      {imgUrl && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="overline">成图</span>
            <a
              href={imgUrl}
              download="figure.png"
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] text-ink-2 hover:text-ink hover:bg-[rgba(26,23,19,0.04)] transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="serif-italic">下载 PNG</span>
            </a>
          </div>
          <div className="overflow-hidden rounded-xl border border-line bg-white">
            {/* 数据 URL 直接用原生 img，避开 next/image 优化器 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgUrl} alt="GPT-image 2 根据提示词生成的科研图" className="w-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
