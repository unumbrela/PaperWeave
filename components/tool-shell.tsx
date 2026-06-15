import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { CSSProperties } from "react";
import type { Tool } from "@/lib/tools-registry";
import { Reveal } from "@/components/reveal";

const ACCENTS: Record<string, string> = {
  "paper-search": "#b14bff",
  summarize: "#ff5d4d",
  "markdown-convert": "#4bb3ff",
  "markdown-summarize": "#6b8ed6",
  "idea-generator": "#f59e0b",
  "prompt-chunker": "#ec4899",
  "skill-maker": "#d24b7f",
  "explain-code": "#8854d0",
  "optimize-prompt": "#3b6ef6",
};

export function ToolShell({
  tool,
  children,
}: {
  tool: Tool;
  children: React.ReactNode;
}) {
  const accent = ACCENTS[tool.slug] ?? "#8854d0";
  const primaryPhase = tool.phases[0] ?? "展厅";
  // Title flows in the tool's own accent → plum → back to accent.
  const flowStyle = {
    "--flow-a": accent,
    "--flow-b": "var(--plum)",
    "--flow-c": accent,
  } as CSSProperties;
  return (
    <div className="mx-auto w-full max-w-6xl px-6 pt-10 pb-20">
      <Reveal className="flex items-center gap-2 text-[12px]">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-ink-3 hover:text-ink transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="overline text-[11px]">返回 · PAPERWEAVE</span>
        </Link>
      </Reveal>

      <Reveal
        as="header"
        delay={90}
        className="mt-6 grid grid-cols-12 items-end gap-6"
      >
        <div className="col-span-12 lg:col-span-9">
          <div className="overline mb-3 flex items-center gap-2" style={{ color: accent }}>
            <span>{primaryPhase} · 工具</span>
            {tool.comingSoon && (
              <span
                className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase"
                style={{
                  borderColor: "var(--line)",
                  color: "var(--ink-3)",
                  letterSpacing: "0.08em",
                }}
              >
                Coming soon
              </span>
            )}
          </div>
          <h1 className="serif text-[44px] sm:text-[60px] leading-[0.96] tracking-[-0.025em] text-ink">
            <span className="serif-italic text-ink-2">{tool.icon}</span>
            <span className="text-flow ml-3" style={flowStyle}>
              {tool.name}
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-ink-2">
            {tool.description}
          </p>
        </div>
        <div className="col-span-12 lg:col-span-3 lg:text-right">
          <div className="hairline mb-3 lg:ml-auto lg:w-24" />
          <div className="overline">Powered by</div>
          <div className="serif text-[22px] mt-1 text-ink">
            Deep<span className="serif-italic">Seek</span>
          </div>
        </div>
      </Reveal>

      {/* accent-tinted divider */}
      <div
        className="mt-10 h-px w-full"
        style={{
          background: `linear-gradient(90deg, ${accent}55, var(--line) 40%, var(--line))`,
        }}
      />

      <Reveal delay={160} className="mt-10">
        {children}
      </Reveal>
    </div>
  );
}
