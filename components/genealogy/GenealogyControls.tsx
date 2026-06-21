"use client";

import { useState } from "react";
import { Download, Target, GitBranch, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Lineage, Relation } from "@/lib/genealogy/lineage";
import { RELATIONS } from "@/lib/genealogy/lineage";
import { RELATION_STYLE } from "@/lib/genealogy/theme";
import { toMarkdown, toSvgString } from "@/lib/genealogy/export";
import type { TreeFilter } from "./GenealogyTree";

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^\w一-龥]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "lineage"
  );
}

function download(name: string, data: string | Blob, type = "text/plain") {
  const blob = typeof data === "string" ? new Blob([data], { type: `${type};charset=utf-8` }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** SVG 字符串 → 2× PNG → 下载（纯浏览器 API，无第三方依赖）。 */
function exportPng(lineage: Lineage) {
  const svg = toSvgString(lineage);
  const m = svg.match(/width="(\d+)" height="(\d+)"/);
  const w = m ? Number(m[1]) : 1200;
  const h = m ? Number(m[2]) : 800;
  const scale = 2;
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) download(`${slugify(lineage.field)}-族谱.png`, blob, "image/png");
    }, "image/png");
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

export function GenealogyControls({
  lineage,
  filter,
  setFilter,
  onJumpFrontier,
}: {
  lineage: Lineage;
  filter: TreeFilter;
  setFilter: (f: TreeFilter) => void;
  onJumpFrontier: () => void;
}) {
  const [exportOpen, setExportOpen] = useState(false);

  const toggleRelation = (r: Relation) => {
    const next = new Set(filter.relations);
    if (next.has(r)) next.delete(r);
    else next.add(r);
    setFilter({ ...filter, relations: next });
  };

  const setTrunkOnly = (v: boolean) => setFilter({ ...filter, trunkOnly: v });

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {/* 关系筛选 */}
      <span className="overline mr-1">关系</span>
      {RELATIONS.map((r) => {
        const active = filter.relations.has(r);
        const st = RELATION_STYLE[r];
        return (
          <button
            key={r}
            onClick={() => toggleRelation(r)}
            disabled={filter.trunkOnly && r !== "builds-on"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] transition-all focus-ring",
              "disabled:opacity-30",
              active
                ? "border-line-strong bg-paper-2 text-ink"
                : "border-line bg-paper-2/40 text-ink-4",
            )}
          >
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: st.color }} />
            {st.label}
          </button>
        );
      })}

      <span className="mx-1 h-4 w-px bg-line" />

      {/* 只看主干 */}
      <button
        onClick={() => setTrunkOnly(!filter.trunkOnly)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] transition-all focus-ring",
          filter.trunkOnly
            ? "border-line-strong bg-paper-2 text-ink"
            : "border-line bg-paper-2/40 text-ink-2 hover:text-ink",
        )}
      >
        <GitBranch className="h-3.5 w-3.5" /> 只看主干
      </button>

      {/* 跳到前沿 */}
      <button
        onClick={onJumpFrontier}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-2/40 px-3 py-1 text-[12px] text-ink-2 transition-all hover:text-ink focus-ring"
      >
        <Target className="h-3.5 w-3.5" /> 跳到前沿
      </button>

      {/* 导出 */}
      <div className="relative ml-auto">
        <button
          onClick={() => setExportOpen((v) => !v)}
          onBlur={() => setTimeout(() => setExportOpen(false), 150)}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-2/40 px-3 py-1 text-[12px] text-ink-2 transition-all hover:text-ink focus-ring"
        >
          <Download className="h-3.5 w-3.5" /> 导出
          <ChevronDown className="h-3 w-3" />
        </button>
        {exportOpen && (
          <div className="absolute right-0 top-full z-10 mt-1 w-40 overflow-hidden rounded-xl border border-line bg-paper shadow-lg">
            {[
              { label: "PNG 图片", run: () => exportPng(lineage) },
              {
                label: "Markdown",
                run: () => download(`${slugify(lineage.field)}-族谱.md`, toMarkdown(lineage), "text/markdown"),
              },
              {
                label: "lineage.json",
                run: () => download(`${slugify(lineage.field)}-lineage.json`, JSON.stringify(lineage, null, 2), "application/json"),
              },
            ].map((item) => (
              <button
                key={item.label}
                onMouseDown={(e) => {
                  e.preventDefault();
                  item.run();
                  setExportOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
              >
                <Check className="h-3 w-3 text-ink-4" /> {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
