import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Tool } from "@/lib/tools-registry";
import { cn } from "@/lib/utils";

const ACCENTS: Record<string, string> = {
  summarize: "#ff5d4d",
  "explain-code": "#8854d0",
  "optimize-prompt": "#3b6ef6",
};

export function ToolCard({ tool, index }: { tool: Tool; index: number }) {
  const accent = ACCENTS[tool.slug] ?? "#8854d0";
  return (
    <Link
      href={tool.href}
      className={cn(
        "group relative block rise-d",
        "surface rounded-[20px] p-6",
        "transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-30px_rgba(26,23,19,0.35)]",
      )}
      style={{ animationDelay: `${400 + index * 80}ms` }}
    >
      {/* accent rail */}
      <span
        aria-hidden
        className="absolute left-6 top-6 bottom-6 w-px origin-top scale-y-50 opacity-30 transition-all duration-500 group-hover:scale-y-100 group-hover:opacity-100"
        style={{ background: accent }}
      />

      <div className="flex items-start justify-between pl-4">
        <div className="overline">{tool.category}</div>
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
        <span
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-2 group-hover:text-ink transition-colors"
        >
          <span className="serif-italic">Open</span>
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
        <span
          className="h-1.5 w-1.5 rounded-full transition-transform group-hover:scale-150"
          style={{ background: accent }}
        />
      </div>
    </Link>
  );
}
