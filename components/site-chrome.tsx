'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { User, KeyRound } from "lucide-react";
import { AccountButton } from "@/components/auth/AccountButton";
import { Reveal } from "@/components/reveal";
import { cn } from "@/lib/utils";

/** 精读（/viewer）走的是沉浸式全屏布局，自带顶栏，全局导航/页脚在这些路由上隐藏。 */
function isImmersiveRoute(pathname: string | null) {
  return !!pathname && pathname.startsWith("/viewer");
}

export function SiteNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  // 滚动感知：rAF 节流，只在跨过阈值时改 state（低频，不会引发卡顿）。
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setScrolled(window.scrollY > 12);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  if (isImmersiveRoute(pathname)) return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : !!pathname?.startsWith(href);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-all duration-500",
        "backdrop-blur-xl border-b",
        scrolled
          ? "bg-[rgba(255,253,247,0.78)] border-[var(--line-strong)] shadow-[0_10px_30px_-22px_rgba(26,23,19,0.45)]"
          : "bg-[rgba(255,253,247,0.45)] border-line",
      )}
    >
      {/* animated gradient hairline that appears once scrolled */}
      <span
        aria-hidden
        className={cn(
          "shimmer-line pointer-events-none absolute inset-x-0 bottom-0 h-px transition-opacity duration-500",
          scrolled ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          "mx-auto max-w-6xl px-6 flex items-center justify-between transition-all duration-500",
          scrolled ? "h-12" : "h-16",
        )}
      >
        <Link
          href="/"
          className="group flex items-end gap-2 font-medium tracking-tight text-ink"
        >
          <span
            aria-hidden
            className="logo-dot-spin inline-block h-4 w-4 rounded-full bg-[conic-gradient(from_220deg,#ff5d4d,#f4c25a,#6b9b6f,#3b6ef6,#9b5de5,#ff5d4d)] shadow-[inset_0_0_0_1px_rgba(26,23,19,0.12)] transition-transform duration-500 group-hover:scale-110"
          />
          <span className="serif text-xl leading-none -mb-0.5">
            Paper<span className="serif-italic">Weave</span>
          </span>
          <span className="overline ml-2 hidden sm:inline text-ink-3">
            研究型论文助手
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-[13px] text-ink-3">
          <Link
            href="/"
            data-active={isActive("/")}
            className="nav-link hover:text-ink transition-colors data-[active=true]:text-ink"
          >
            工作流
          </Link>
          <Link
            href="/settings"
            data-active={isActive("/settings")}
            className="nav-link flex items-center gap-1.5 hover:text-ink transition-colors data-[active=true]:text-ink"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">API Key</span>
          </Link>
          <Link
            href="/library"
            className="flex items-center gap-2 hover:text-ink transition-colors"
          >
            <span className="sr-only">个人论文库</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff5d4d] to-[#9b5de5] flex items-center justify-center shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
              <User className="w-4 h-4 text-white" />
            </div>
          </Link>
          <AccountButton />
        </nav>
      </div>
    </header>
  );
}

const FOOTER_LINKS: Array<{ heading: string; items: Array<{ label: string; href: string }> }> = [
  {
    heading: "工作流",
    items: [
      { label: "文献检索", href: "/tools/paper-search" },
      { label: "创新点立论", href: "/tools/idea-generator" },
      { label: "结构撰写", href: "/tools/paper-writer" },
    ],
  },
  {
    heading: "我的",
    items: [
      { label: "论文库", href: "/library" },
      { label: "统计看板", href: "/library/stats" },
      { label: "API Key", href: "/settings" },
    ],
  },
  {
    heading: "关于",
    items: [
      { label: "文库问答", href: "/tools/library-qa" },
      { label: "引文网络图谱", href: "/tools/citation-graph" },
      { label: "首页", href: "/" },
    ],
  },
];

export function SiteFooter() {
  const pathname = usePathname();
  if (isImmersiveRoute(pathname)) return null;

  return (
    <footer className="relative mt-24">
      <span aria-hidden className="shimmer-line block h-px w-full" />
      <Reveal className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-12">
          {/* Brand block */}
          <div className="col-span-2 md:col-span-5">
            <Link href="/" className="inline-flex items-end gap-2">
              <span
                aria-hidden
                className="logo-dot-spin inline-block h-4 w-4 rounded-full bg-[conic-gradient(from_220deg,#ff5d4d,#f4c25a,#6b9b6f,#3b6ef6,#9b5de5,#ff5d4d)] shadow-[inset_0_0_0_1px_rgba(26,23,19,0.12)]"
              />
              <span className="text-flow serif text-[34px] leading-none">
                Paper<span className="serif-italic">Weave</span>
              </span>
            </Link>
            <p className="mt-5 max-w-xs text-[13px] leading-relaxed text-ink-3">
              一个研究型论文助手。把查、读、想、验、画、讲、展，串成同一条工作流。
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_LINKS.map((group) => (
            <nav
              key={group.heading}
              className="col-span-1 md:col-span-2 lg:col-span-2 flex flex-col gap-3"
            >
              <span className="overline">{group.heading}</span>
              {group.items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="w-fit text-[13px] text-ink-2 transition-colors hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
          <span className="overline">© {new Date().getFullYear()} · PAPERWEAVE</span>
          <span className="text-xs text-ink-3">
            <span className="serif-italic text-ink">Research</span>, woven
            <span className="mx-1.5 text-ink-4">·</span>
            from <span className="serif-italic text-ink">search</span> to{" "}
            <span className="serif-italic text-ink">story</span>
          </span>
        </div>
      </Reveal>
    </footer>
  );
}
