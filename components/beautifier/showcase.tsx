"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Copy, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { MeshOrbsBackground } from "./mesh-orbs-background";
import { RaycastBackground } from "./raycast-background";
import { TraeBackground } from "./trae-background";

type Item = {
  slug: "mesh-orbs" | "raycast" | "trae";
  name: string;
  tagline: string;
  inspiration?: string;
  componentName: string;
  filename: string;
  source: string;
  theme: "light" | "dark";
  accent: string;
};

const PREVIEWS: Record<Item["slug"], React.ComponentType> = {
  "mesh-orbs": MeshOrbsBackground,
  raycast: RaycastBackground,
  trae: TraeBackground,
};

export function BeautifierShowcase({ items }: { items: Item[] }) {
  return (
    <div className="flex flex-col gap-8">
      {items.map((item, i) => (
        <ShowcaseRow key={item.slug} item={item} index={i + 1} />
      ))}
    </div>
  );
}

function ShowcaseRow({ item, index }: { item: Item; index: number }) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);
  const Preview = PREVIEWS[item.slug];

  const usage = buildUsage(item);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <article
      className="rise-d surface rounded-[22px] overflow-hidden"
      style={{ animationDelay: `${200 + index * 90}ms` }}
    >
      {/* Header row */}
      <header className="flex items-start justify-between gap-4 px-6 pt-6">
        <div className="flex items-start gap-4">
          <span
            className="numeral text-[44px] leading-none opacity-60"
            style={{ color: item.accent }}
          >
            {String(index).padStart(2, "0")}
          </span>
          <div>
            <div className="overline flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: item.accent }}
              />
              Plug-and-play · {item.theme === "dark" ? "Dark" : "Light"}
            </div>
            <h3 className="mt-2 serif text-[28px] leading-tight tracking-tight text-ink">
              {item.name}
            </h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2 max-w-xl">
              {item.tagline}
            </p>
            {item.inspiration && (
              <a
                href={item.inspiration}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink transition-colors"
              >
                <span className="serif-italic">Inspired by</span>
                <span className="mono">{item.inspiration.replace(/^https?:\/\//, "")}</span>
                <ArrowUpRight className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {/* tab switcher */}
        <div className="surface rounded-full p-1 flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => setTab("preview")}
            className={cn(
              "px-3 py-1 text-[12px] rounded-full transition-colors inline-flex items-center gap-1.5",
              tab === "preview" ? "bg-ink text-paper-2" : "text-ink-2 hover:text-ink",
            )}
          >
            <Eye className="h-3 w-3" /> 预览
          </button>
          <button
            onClick={() => setTab("code")}
            className={cn(
              "px-3 py-1 text-[12px] rounded-full transition-colors",
              tab === "code" ? "bg-ink text-paper-2" : "text-ink-2 hover:text-ink",
            )}
          >
            代码
          </button>
        </div>
      </header>

      <div className="px-6 pt-5 pb-6">
        {tab === "preview" ? (
          <PreviewPanel Component={Preview} theme={item.theme} />
        ) : (
          <CodePanel item={item} usage={usage} copied={copied} onCopy={copy} />
        )}
      </div>
    </article>
  );
}

function PreviewPanel({
  Component,
  theme,
}: {
  Component: React.ComponentType;
  theme: "light" | "dark";
}) {
  return (
    <div className="relative h-[360px] rounded-2xl overflow-hidden border border-line">
      <Component />
      {/* floating label inside preview */}
      <div className="absolute inset-0 flex items-end justify-between p-5 pointer-events-none">
        <div
          className={cn(
            "rounded-full px-3 py-1 text-[11px] mono tracking-[0.14em] uppercase backdrop-blur-md border",
            theme === "dark"
              ? "bg-white/10 border-white/15 text-white/80"
              : "bg-black/5 border-black/10 text-ink-2",
          )}
        >
          Live preview · 60 fps
        </div>
        <div
          className={cn(
            "rounded-full px-3 py-1 text-[11px] mono tracking-[0.14em] uppercase backdrop-blur-md border",
            theme === "dark"
              ? "bg-white/10 border-white/15 text-white/80"
              : "bg-black/5 border-black/10 text-ink-2",
          )}
        >
          CSS only
        </div>
      </div>
    </div>
  );
}

function CodePanel({
  item,
  usage,
  copied,
  onCopy,
}: {
  item: Item;
  usage: string;
  copied: boolean;
  onCopy: (t: string) => void;
}) {
  const [which, setWhich] = useState<"component" | "usage">("component");
  const text = which === "component" ? item.source : usage;
  return (
    <div className="rounded-2xl border border-line overflow-hidden bg-[#fbfaf6]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-line bg-[rgba(255,253,247,0.7)]">
        <div className="flex items-center gap-1">
          <CodeTab active={which === "component"} onClick={() => setWhich("component")}>
            {item.filename}
          </CodeTab>
          <CodeTab active={which === "usage"} onClick={() => setWhich("usage")}>
            usage.tsx
          </CodeTab>
        </div>
        <button
          onClick={() => onCopy(text)}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] transition-colors",
            copied
              ? "bg-ink text-paper-2"
              : "text-ink-2 hover:text-ink hover:bg-black/5",
          )}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> 已复制
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> 复制
            </>
          )}
        </button>
      </div>
      <pre className="m-0 max-h-[420px] overflow-auto px-5 py-4 text-[12.5px] leading-[1.65] text-ink mono">
        <code>{text}</code>
      </pre>
    </div>
  );
}

function CodeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-md text-[12px] mono transition-colors",
        active ? "bg-black/5 text-ink" : "text-ink-3 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function buildUsage(item: Item): string {
  return `import { ${item.componentName} } from "@/components/beautifier/${item.filename.replace(/\.tsx$/, "")}";

export default function Page() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <${item.componentName} />
      <main className="relative z-10">
        {/* 你的内容 */}
      </main>
    </div>
  );
}
`;
}
