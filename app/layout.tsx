import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono, Fraunces } from "next/font/google";
import Link from "next/link";
import { User } from "lucide-react";
import { MeshBackground } from "@/components/mesh-background";
import "./globals.css";
import "./tools/hpi-potsdam/landing.css";
import "./tools/hpi-potsdam/overrides.css";
import "./tools/beautiful-aurora/aurora.css";
import "./tools/bruno-folio/bruno.css";
import "./tools/fluid-sim/fluid.css";
import "./tools/hamish-portfolio/hamish.css";

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
  title: "PaperWeave · 研究型论文助手",
  description:
    "把查文献、读文献、生 idea、做验证、论文绘图、讲结果、可视化表达串成一条研究工作流。PaperWeave 不替你写论文，但让其他每一步都顺起来。",
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
            Paper<span className="serif-italic">Weave</span>
          </span>
          <span className="overline ml-2 hidden sm:inline text-ink-3">
            研究型论文助手
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-[13px] text-ink-3">
          <Link href="/" className="hover:text-ink transition-colors">
            工作流
          </Link>
          <Link
            href="/library"
            className="flex items-center gap-2 hover:text-ink transition-colors"
          >
            <span className="sr-only">个人论文库</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff5d4d] to-[#9b5de5] flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
              <User className="w-4 h-4 text-white" />
            </div>
          </Link>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line py-8 px-6">
      <div className="mx-auto max-w-6xl flex items-center justify-between">
        <span className="overline">© {new Date().getFullYear()} · PAPERWEAVE</span>
        <span className="text-xs text-ink-3">
          <span className="serif-italic text-ink">Research</span>, woven
          <span className="mx-1.5 text-ink-4">·</span>
          from <span className="serif-italic text-ink">search</span> to{" "}
          <span className="serif-italic text-ink">story</span>
        </span>
      </div>
    </footer>
  );
}
