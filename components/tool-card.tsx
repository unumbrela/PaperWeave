"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Tool } from "@/lib/tools-registry";
import { cn } from "@/lib/utils";

const ACCENTS: Record<string, string> = {
  "paper-search": "#b14bff",
  summarize: "#ff5d4d",
  "markdown-convert": "#4bb3ff",
  "markdown-summarize": "#6b8ed6",
  "idea-generator": "#f59e0b",
  "paper-writer": "#ec4899",
  "prompt-chunker": "#ec4899",
  "skill-maker": "#d24b7f",
  "cnn-explainer": "#f4c25a",
  "med-seg-explainer": "#6b8ed6",
  "hpi-potsdam": "#4cc9f0",
  "beautiful-aurora": "#00c2ff",
  "web-beautifier": "#ff3d7f",
  "toolbox-background": "#ff8aa0",
  "fluid-sim": "#ff4f8b",
  "hamish-portfolio": "#0ea5e9",
  "bruno-folio": "#f97316",
  "algorithm-visualizer": "#4CAF50",
  "explain-code": "#8854d0",
  "optimize-prompt": "#3b6ef6",
};

const MAX_TILT = 7; // degrees

export function ToolCard({ tool, index }: { tool: Tool; index: number }) {
  const accent = ACCENTS[tool.slug] ?? "#8854d0";
  // 展厅 / lab 工具不属于任何工作流阶段，眉标用统一标签。
  const primaryPhase =
    tool.phases[0] ??
    (tool.track === "gallery" ? "展厅" : tool.track === "lab" ? "扩展" : "");
  // Stagger: cards emerge in reading order (left→right, then top→bottom).
  // A longer 160ms step lets each card fully take its place before the next
  // starts growing in, so the "small → large" scale reads clearly.
  const delayMs = 500 + index * 160;

  const tiltRef = useRef<HTMLDivElement | null>(null);
  const raf = useRef(0);

  const onMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    const el = tiltRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0–1
    const py = (e.clientY - rect.top) / rect.height; // 0–1
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      el.style.setProperty("--tilt-y", `${(px - 0.5) * 2 * MAX_TILT}deg`);
      el.style.setProperty("--tilt-x", `${-(py - 0.5) * 2 * MAX_TILT}deg`);
      el.style.setProperty("--tilt-lift", "-6px");
      el.style.setProperty("--glow-x", `${px * 100}%`);
      el.style.setProperty("--glow-y", `${py * 100}%`);
      el.style.setProperty("--glow-o", "0.7");
    });
  };

  const onLeave = () => {
    const el = tiltRef.current;
    if (!el) return;
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = 0;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
    el.style.setProperty("--tilt-lift", "0px");
    el.style.setProperty("--glow-o", "0");
  };

  return (
    <Link
      href={tool.href}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="group relative block card-emerge [perspective:1000px]"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div
        ref={tiltRef}
        className={cn("card-glass tilt relative rounded-[20px] p-6")}
      >
        {/* accent rail */}
        <span
          aria-hidden
          className="absolute left-6 top-6 bottom-6 w-px origin-top scale-y-50 opacity-30 transition-all duration-500 group-hover:scale-y-100 group-hover:opacity-100"
          style={{ background: accent }}
        />

        <div className="flex items-start justify-between pl-4">
          <div className="flex items-center gap-2">
            <div className="overline">{primaryPhase}</div>
            {tool.comingSoon && (
              <span
                className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider"
                style={{
                  borderColor: "var(--line)",
                  color: "var(--ink-3)",
                  letterSpacing: "0.08em",
                }}
              >
                Coming
              </span>
            )}
          </div>
          <div
            className="numeral text-[42px] leading-none opacity-50 transition-opacity group-hover:opacity-90"
            style={{ color: accent }}
          >
            {String(index).padStart(2, "0")}
          </div>
        </div>

        <h3 className="pl-4 mt-8 serif text-[26px] leading-tight tracking-tight text-ink">
          {tool.name}
        </h3>

        <p className="pl-4 mt-3 text-[13.5px] leading-relaxed text-ink-2">
          {tool.description}
        </p>

        <div className="pl-4 mt-7 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-2 group-hover:text-ink transition-colors">
            <span className="serif-italic">
              {tool.comingSoon ? "Preview" : "Open"}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
          <span
            className="h-1.5 w-1.5 rounded-full transition-transform group-hover:scale-150"
            style={{ background: accent }}
          />
        </div>
      </div>
    </Link>
  );
}
