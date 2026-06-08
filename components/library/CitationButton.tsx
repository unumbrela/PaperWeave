"use client";

import { useState, useRef, useEffect } from "react";
import { Quote, Copy, Check } from "lucide-react";
import type { Paper } from "@/lib/db/types";
import {
  toBibTeX,
  formatCitation,
  CITE_STYLE_LABELS,
  type CiteStyle,
} from "@/lib/export/citations";
import { cn } from "@/lib/utils";

type Tab = CiteStyle | "bibtex";

const TABS: { id: Tab; label: string }[] = [
  { id: "bibtex", label: "BibTeX" },
  { id: "apa", label: CITE_STYLE_LABELS.apa },
  { id: "mla", label: CITE_STYLE_LABELS.mla },
  { id: "gbt7714", label: CITE_STYLE_LABELS.gbt7714 },
];

/** 单篇引文导出：弹出层切换 BibTeX / APA / MLA / GB-T 7714 并一键复制。 */
export function CitationButton({ paper }: { paper: Paper }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("bibtex");
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const text = tab === "bibtex" ? toBibTeX(paper) : formatCitation(paper, tab);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 忽略复制失败 */
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex-shrink-0 rounded p-1 text-ink-3 transition-colors hover:bg-paper-3 hover:text-ink"
        title="导出引文"
      >
        <Quote className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[360px] max-w-[80vw] rounded-xl border border-line bg-paper-2 p-3 shadow-xl">
          <div className="mb-2 flex items-center gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[12px] transition-colors",
                  tab === t.id ? "bg-coral/15 text-coral" : "text-ink-3 hover:text-ink",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-paper-3/60 p-3 text-[12px] leading-relaxed text-ink-2">
            {text}
          </pre>
          <button
            onClick={copy}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-coral/10 px-3 py-1.5 text-[12px] text-coral transition-colors hover:bg-coral/20"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "已复制" : "复制"}
          </button>
        </div>
      )}
    </div>
  );
}
