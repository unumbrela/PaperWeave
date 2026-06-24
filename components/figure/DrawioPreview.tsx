"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Download, Code2, ZoomIn, ZoomOut, Maximize2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadDrawio } from "@/lib/figure/drawio";
import { renderMxToSvg } from "@/lib/figure/mxgraph-render";

/**
 * draw.io 预览：用自包含 SVG 渲染器把 mxfile 画出来（零外部依赖，不再依赖国内常被墙的
 * viewer.diagrams.net CDN，避免预览永远卡「加载中」）。同时永远提供「查看/复制 XML」与
 * 「下载 .drawio」——下载后可在官方 draw.io 编辑器拿到完整保真的可编辑图。
 */
export function DrawioPreview({ xml, className }: { xml: string; className?: string }) {
  const [showXml, setShowXml] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scale, setScale] = useState(1);

  const rendered = useMemo(() => renderMxToSvg(xml), [xml]);

  const copy = async () => {
    await navigator.clipboard.writeText(xml);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!xml) return null;
  const canRender = !!rendered;
  // 渲染失败时强制展示 XML（至少让用户拿到结果）
  const viewingXml = showXml || !canRender;

  return (
    <div className={cn("surface rounded-[20px] overflow-hidden flex flex-col", className)}>
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="overline">drawio 预览</span>
        <div className="flex items-center gap-1">
          {canRender && !showXml && (
            <>
              <button
                onClick={() => setScale((s) => Math.max(0.3, +(s - 0.2).toFixed(2)))}
                className="inline-flex items-center rounded-full px-2 py-1 text-ink-2 hover:text-ink hover:bg-[rgba(26,23,19,0.04)] transition-colors"
                title="缩小"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setScale(1)}
                className="inline-flex items-center rounded-full px-2 py-1 text-ink-2 hover:text-ink hover:bg-[rgba(26,23,19,0.04)] transition-colors"
                title="复位"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setScale((s) => Math.min(3, +(s + 0.2).toFixed(2)))}
                className="inline-flex items-center rounded-full px-2 py-1 text-ink-2 hover:text-ink hover:bg-[rgba(26,23,19,0.04)] transition-colors"
                title="放大"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <span className="mx-1 h-4 w-px bg-line" />
            </>
          )}
          <button
            onClick={() => setShowXml((v) => !v)}
            disabled={!canRender}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] text-ink-2 hover:text-ink hover:bg-[rgba(26,23,19,0.04)] transition-colors disabled:opacity-40"
            title="切换 图 / XML"
          >
            <Code2 className="h-3.5 w-3.5" />
            <span className="serif-italic">{viewingXml ? "图" : "xml"}</span>
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
            title="下载 .drawio（可在 draw.io 打开编辑）"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="serif-italic">.drawio</span>
          </button>
        </div>
      </div>

      <div className="bg-white min-h-[320px] flex-1 overflow-auto">
        {viewingXml ? (
          <div className="p-4">
            {!canRender && (
              <p className="mb-2 flex items-center gap-1.5 text-[12px] text-[#a3742b]">
                <AlertTriangle className="h-3.5 w-3.5" />
                这段图含本预览器暂不支持的元素，已展示 XML —— 下载 .drawio 后在 draw.io 中可看到完整图。
              </p>
            )}
            <pre className="rounded-xl bg-paper-2/80 border border-line p-4 text-[11px] leading-relaxed text-ink whitespace-pre-wrap break-words font-mono max-h-[460px] overflow-auto">
              {xml}
            </pre>
          </div>
        ) : (
          <div className="p-4">
            {/* 默认按容器宽度自适应（svg 自带 max-width:100%）；zoom 在此基础上缩放 */}
            <div
              className="origin-top-left transition-transform"
              style={{ transform: `scale(${scale})` }}
              // 自渲染 SVG 为可信内容（本地生成，无脚本）
              dangerouslySetInnerHTML={{ __html: rendered!.svg }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
