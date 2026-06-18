import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  WORKFLOW_PHASES,
  getUpstreamTool,
  getDownstreamTool,
  type Tool,
} from "@/lib/tools-registry";
import { cn } from "@/lib/utils";

/**
 * 工作流位置条 —— 让「织」被看见。每个 workflow 工具页在此显示：
 *   [← 上游工具]   ①查 ②读 ③idea ④验证 ⑤绘图（高亮当前环）   [下游工具 →]
 * 呼应 app/globals.css 的 .loom 经纬隐喻：环点用 hairline 连成一条线，
 * 当前环染上工具自己的 accent。gallery 工具（phases 为空）不渲染。
 */
export function WorkflowRail({ tool, accent }: { tool: Tool; accent: string }) {
  if (tool.track !== "workflow" || tool.phases.length === 0) return null;

  const currentPhase = tool.phases[0];
  const currentIndex = WORKFLOW_PHASES.indexOf(currentPhase);
  const upstream = getUpstreamTool(tool.slug);
  const downstream = getDownstreamTool(tool.slug);

  return (
    <nav
      aria-label="工作流位置"
      className="surface flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl px-4 py-3"
    >
      {/* 上游 */}
      <div className="flex min-w-0 items-center">
        {upstream ? (
          <Link
            href={upstream.href}
            className="group inline-flex min-w-0 items-center gap-1.5 text-ink-2 transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-ink-3 transition-colors group-hover:text-ink" />
            <span className="overline shrink-0">上游</span>
            <span className="truncate text-[12px]">{upstream.name}</span>
          </Link>
        ) : (
          <span className="overline text-ink-4">链路起点</span>
        )}
      </div>

      {/* 5 环走廊 */}
      <ol className="flex items-center gap-0">
        {WORKFLOW_PHASES.map((phase, i) => {
          const active = i === currentIndex;
          const done = i < currentIndex;
          return (
            <li key={phase} className="flex items-center">
              <span
                className="flex items-center gap-1.5"
                title={phase}
                aria-current={active ? "step" : undefined}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-transform",
                    active ? "scale-150" : done ? "" : "opacity-50",
                  )}
                  style={{
                    background: active
                      ? accent
                      : done
                        ? "var(--ink-3)"
                        : "var(--ink-4)",
                  }}
                />
                <span
                  className={cn(
                    "text-[11px] tracking-tight transition-colors",
                    active ? "font-medium text-ink" : "text-ink-3",
                    "hidden sm:inline",
                  )}
                  style={active ? { color: accent } : undefined}
                >
                  {phase}
                </span>
              </span>
              {i < WORKFLOW_PHASES.length - 1 && (
                <span
                  aria-hidden
                  className="mx-1.5 h-px w-4 sm:w-6"
                  style={{
                    background: i < currentIndex ? "var(--line-strong)" : "var(--line)",
                  }}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* 下游 */}
      <div className="flex min-w-0 items-center justify-end">
        {downstream ? (
          <Link
            href={downstream.href}
            className="group inline-flex min-w-0 items-center gap-1.5 text-ink-2 transition-colors hover:text-ink"
          >
            <span className="overline shrink-0">下游</span>
            <span className="truncate text-[12px]">{downstream.name}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-3 transition-colors group-hover:text-ink" />
          </Link>
        ) : (
          <span className="overline text-ink-4">链路终点</span>
        )}
      </div>
    </nav>
  );
}
