"use client";

import { useEffect } from "react";
import { X, ExternalLink, Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { SendToTool } from "@/components/workflow/handoff-controls";
import type { Lineage, LineageNode } from "@/lib/genealogy/lineage";
import { relatives } from "@/lib/genealogy/layout";
import { ROLE_GLYPH, ROLE_COLOR, ROLE_LABEL } from "@/lib/genealogy/theme";
import type { NodeRole } from "@/lib/genealogy/lineage";

/** 单篇 → 送往「创新点立论」：把这一篇作为立论的参考前驱。 */
function ideaPayload(lineage: Lineage, node: LineageNode) {
  return {
    from: "研究脉络族谱",
    fields: {
      direction: lineage.field,
      references: `「${lineage.field}」方向中的一篇关键工作（来自发展谱系）：\n- ${node.authors} (${node.year}): ${node.title}${
        node.contribution ? `\n  关键贡献：${node.contribution}` : ""
      }${node.problem ? `\n  针对问题：${node.problem}` : ""}`,
    },
  };
}

export function NodeDetail({
  lineage,
  node,
  role,
  verified,
  onClose,
}: {
  lineage: Lineage;
  node: LineageNode | null;
  role?: NodeRole;
  /** 主干入边核验状态：true 已核验 / false 未核验 / undefined 无入边或网页版 */
  verified?: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (node) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [node, onClose]);

  const kin = node ? relatives(lineage).get(node.id) : undefined;
  const open = !!node;
  const r = role ?? "normal";

  return (
    <>
      {/* 遮罩 */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-ink/20 backdrop-blur-[1px] transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      {/* 右侧抽屉 */}
      <aside
        role="dialog"
        aria-label="论文详情"
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-[440px] flex-col",
          "border-l border-line bg-paper shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {node && (
          <>
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2">
                <span style={{ color: ROLE_COLOR[r] }} className="text-[15px]">
                  {ROLE_GLYPH[r]}
                </span>
                <span className="overline">{ROLE_LABEL[r]} · 论文详情</span>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink focus-ring"
                aria-label="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <h3 className="serif text-[19px] leading-snug text-ink">{node.title}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-2">
                <span className="font-medium">{node.authors}</span>
                <span className="text-ink-4">·</span>
                <span>{node.year}</span>
                {node.venue && (
                  <>
                    <span className="text-ink-4">·</span>
                    <span>{node.venue}</span>
                  </>
                )}
                {typeof node.citations === "number" && (
                  <>
                    <span className="text-ink-4">·</span>
                    <span>被引 {node.citations}</span>
                  </>
                )}
              </div>

              {/* 核验状态 */}
              {verified !== undefined && (
                <div
                  className="mt-3 rounded-lg border px-3 py-2 text-[12px]"
                  style={{
                    borderColor: verified ? "rgba(46,125,50,0.3)" : "rgba(178,106,0,0.3)",
                    background: verified ? "rgba(46,125,50,0.06)" : "rgba(178,106,0,0.06)",
                    color: verified ? "#2e7d32" : "#8a5a00",
                  }}
                >
                  {verified
                    ? "✓ 它与主干前驱的 builds-on 关系，已由真实引文核验。"
                    : "⚠ 这条 builds-on 边由 AI 综合、未经引文核验（网页版）。需逐边核验请走终端深度模式。"}
                </div>
              )}

              {/* 问题 → 贡献 */}
              {(node.problem || node.contribution) && (
                <div className="mt-4 space-y-3">
                  {node.problem && (
                    <div>
                      <div className="overline mb-1">针对问题</div>
                      <p className="text-[13px] leading-relaxed text-ink-2">{node.problem}</p>
                    </div>
                  )}
                  {node.contribution && (
                    <div>
                      <div className="overline mb-1">关键贡献</div>
                      <p className="text-[13px] leading-relaxed text-ink-2">{node.contribution}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 血缘 */}
              {kin && (kin.ancestors.size > 0 || kin.descendants.size > 0) && (
                <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
                  <div className="rounded-lg bg-paper-2/60 px-3 py-2">
                    <div className="overline mb-0.5">承自</div>
                    <div className="text-ink-2">{kin.ancestors.size} 篇前驱</div>
                  </div>
                  <div className="rounded-lg bg-paper-2/60 px-3 py-2">
                    <div className="overline mb-0.5">启后</div>
                    <div className="text-ink-2">{kin.descendants.size} 篇后继</div>
                  </div>
                </div>
              )}

              {node.url && (
                <a
                  href={node.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] text-ink-2 underline decoration-line-strong underline-offset-2 transition-colors hover:text-ink"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> 在 OpenAlex 打开
                </a>
              )}
            </div>

            {/* 送往下游 */}
            <div className="border-t border-line px-5 py-4">
              <div className="overline mb-2 flex items-center gap-1.5">
                <Quote className="h-3.5 w-3.5" /> 以这一篇为起点
              </div>
              <div className="flex flex-wrap gap-2">
                <SendToTool
                  targetSlug="idea-generator"
                  payload={ideaPayload(lineage, node)}
                  label="送去「创新点立论」"
                />
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
