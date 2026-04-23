import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono, Fraunces } from "next/font/google";
import Link from "next/link";
import { MeshBackground } from "@/components/mesh-background";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

// Display serif for the hero headline — Fraunces has a SOFT axis that
// gives italic cuts a distinctly hand-carved, editorial quality.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Toolbox · 慢慢长大的小工具合集",
  description:
    "一个慢慢长大的小工具合集：AI 写作助手、可交互可视化、本地文档处理——按需取用，每周打磨一件。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-CN"
      className={`${inter.variable} ${instrument.variable} ${jetbrainsMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full text-ink">
        <MeshBackground />
        <div className="relative z-10 flex min-h-full flex-col">
          <SiteNav />
          <main className="flex-1 flex flex-col">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}

function SiteNav() {
  return (
    <header className="sticky top-0 z-40 bg-[rgba(255,253,247,0.55)] backdrop-blur-xl border-b border-line">
      <div className="mx-auto max-w-6xl h-14 px-6 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-end gap-2 font-medium tracking-tight text-ink"
        >
          <span
            aria-hidden
            className="inline-block h-4 w-4 rounded-full bg-[conic-gradient(from_220deg,#ff5d4d,#f4c25a,#6b9b6f,#3b6ef6,#9b5de5,#ff5d4d)] shadow-[inset_0_0_0_1px_rgba(26,23,19,0.12)]"
          />
          <span className="serif text-xl leading-none -mb-0.5">
            Tool<span className="serif-italic">box</span>
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-[13px] text-ink-3">
          <Link href="/" className="hover:text-ink transition-colors">
            工具
          </Link>
          <a
            href="https://platform.deepseek.com/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-ink transition-colors"
          >
            部分 AI 来自 <span className="serif-italic text-ink">DeepSeek</span>
          </a>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line py-8 px-6">
      <div className="mx-auto max-w-6xl flex items-center justify-between">
        <span className="overline">© {new Date().getFullYear()} · TOOLBOX</span>
        <span className="text-xs text-ink-3">
          Crafted with <span className="serif-italic text-ink">restraint</span>
          <span className="mx-1.5 text-ink-4">·</span>
          <span className="serif-italic text-ink">slowly</span> growing
        </span>
      </div>
    </footer>
  );
}
