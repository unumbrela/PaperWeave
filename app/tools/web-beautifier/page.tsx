import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BeautifierShowcase } from "@/components/beautifier/showcase";
import { loadSnippets } from "@/lib/beautifier/snippets";
import { getTool } from "@/lib/tools-registry";

export const dynamic = "force-static";

export default function WebBeautifierPage() {
  const tool = getTool("web-beautifier");
  const items = loadSnippets();

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-16 pb-24">
      <div className="rise-d" style={{ animationDelay: "40ms" }}>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-ink transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="mono tracking-[0.14em] uppercase">All tools</span>
        </Link>
      </div>

      <header className="mt-10 grid grid-cols-12 gap-6 items-end">
        <h1
          className="rise col-span-12 lg:col-span-9 leading-[0.95] tracking-[-0.03em] text-[56px] sm:text-[80px] lg:text-[96px] text-ink"
          style={{ animationDelay: "120ms" }}
        >
          <span className="serif-italic text-ink-2">Web</span>{" "}
          <span className="font-medium">Beautifier</span>
        </h1>
        <div
          className="rise col-span-12 lg:col-span-3 lg:pb-3"
          style={{ animationDelay: "260ms" }}
        >
          <div className="hairline mb-4" />
          <p className="text-[13px] leading-relaxed text-ink-2 max-w-xs">
            一组开箱即用的背景 / 动效组件，
            <span className="serif-italic text-ink">drop-in</span> 到任何
            <span className="mono text-[12px]"> relative </span>
            容器即可工作。复制即可落地，后续持续新增。
          </p>
        </div>
      </header>

      <div className="rise-d mt-10 flex items-center gap-3 text-[12px] text-ink-3">
        <span className="overline">{tool?.phases[0] ?? "资产"}</span>
        <span className="h-3 w-px bg-[var(--line-strong)]" />
        <span className="mono">
          {items.length} component{items.length > 1 ? "s" : ""}
        </span>
        <span className="h-3 w-px bg-[var(--line-strong)]" />
        <span>CSS only · 零依赖 · 自包含 &lt;style&gt;</span>
      </div>

      <div className="hairline mt-8" />

      <div className="mt-10">
        <BeautifierShowcase items={items} />
      </div>

      <div className="mt-16 surface rounded-[22px] p-8">
        <div className="overline">Coming soon</div>
        <h3 className="mt-3 serif text-[24px] tracking-tight text-ink">
          <span className="serif-italic text-ink-2">More</span> drop-ins on the
          way.
        </h3>
        <p className="mt-2 text-[13.5px] text-ink-2 max-w-xl leading-relaxed">
          下一批计划：噪点/颗粒层、渐变描边按钮、玻璃拟物卡片、磁吸光标、滚动视差。
          有想法直接丢给我。
        </p>
      </div>
    </section>
  );
}
