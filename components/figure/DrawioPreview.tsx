"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Check, Copy, Download, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadDrawio } from "@/lib/figure/drawio";

// diagrams.net 官方静态查看器：把 mxfile XML 渲染成 SVG（只读，自带缩放/图层/在 draw.io 打开）。
const VIEWER_SRC = "https://viewer.diagrams.net/js/viewer-static.min.js";

declare global {
  interface Window {
    GraphViewer?: {
      createViewerForElement: (el: Element, onload?: (viewer: unknown) => void) => void;
    };
  }
}

export function DrawioPreview({ xml, className }: { xml: string; className?: string }) {
  const holderRef = useRef<HTMLDivElement>(null);
  // 脚本可能已被其它实例加载过：用惰性初值探一次，避免在 effect 里 setState。
  const [ready, setReady] = useState(
    () => typeof window !== "undefined" && !!window.GraphViewer,
  );
  const [failed, setFailed] = useState(false);
  const [showXml, setShowXml] = useState(false);
  const [copied, setCopied] = useState(false);

  // xml / 查看器就绪后渲染。每次重建内部 holder，避免重复叠加。
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const outer = holderRef.current;
    if (!outer || !xml) return;
    if (!ready || !window.GraphViewer) return;
    setFailed(false);
    try {
      outer.innerHTML = "";
      const holder = document.createElement("div");
      holder.className = "mxgraph";
      holder.style.maxWidth = "100%";
      holder.setAttribute(
        "data-mxgraph",
        JSON.stringify({
          xml,
          highlight: "#b14bff",
          nav: true,
          resize: true,
          toolbar: "zoom layers lightbox",
          edit: "_blank", // 查看器工具栏的编辑按钮 → 在 draw.io 打开本图
        }),
      );
      outer.appendChild(holder);
      window.GraphViewer.createViewerForElement(holder);
    } catch {
      setFailed(true);
    }
  }, [xml, ready]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const copy = async () => {
    await navigator.clipboard.writeText(xml);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!xml) return null;
  const degraded = failed || (!ready && false); // ready 由脚本回调驱动；失败才降级

  return (
    <div className={cn("surface rounded-[20px] overflow-hidden flex flex-col", className)}>
      <Script
        src={VIEWER_SRC}
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() => setFailed(true)}
      />

      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="overline">drawio 预览</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowXml((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] text-ink-2 hover:text-ink hover:bg-[rgba(26,23,19,0.04)] transition-colors"
            title="查看 XML"
          >
            <Code2 className="h-3.5 w-3.5" />
            <span className="serif-italic">{showXml ? "图" : "xml"}</span>
          </button>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] text-ink-2 hover:text-ink hover:bg-[rgba(26,23,19,0.04)] transition-colors"
            title="复制 XML"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[var(--sage)]" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="serif-italic">{copied ? "copied" : "copy"}</span>
          </button>
          <button
            onClick={() => downloadDrawio(xml, "diagram.drawio")}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] text-ink-2 hover:text-ink hover:bg-[rgba(26,23,19,0.04)] transition-colors"
            title="下载 .drawio"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="serif-italic">.drawio</span>
          </button>
        </div>
      </div>

      <div className="p-4 bg-white min-h-[320px] flex-1">
        {showXml || degraded ? (
          <>
            {degraded && !showXml && (
              <p className="mb-2 text-[12px] text-ink-3 serif-italic">
                查看器加载失败，已降级为 XML —— 可点「.drawio」下载后在 draw.io 中打开。
              </p>
            )}
            <pre className="rounded-xl bg-paper-2/80 border border-line p-4 text-[11px] leading-relaxed text-ink whitespace-pre-wrap break-words font-mono max-h-[420px] overflow-auto">
              {xml}
            </pre>
          </>
        ) : (
          <>
            <div ref={holderRef} className={cn("w-full", !ready && "hidden")} />
            {!ready && (
              <div className="flex h-[280px] items-center justify-center text-center">
                <p className="serif-italic text-[18px] text-ink-3">正在加载 draw.io 查看器…</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
