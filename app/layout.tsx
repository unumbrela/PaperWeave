import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono, Fraunces } from "next/font/google";
import { MeshBackground } from "@/components/mesh-background";
import { AuthProvider } from "@/lib/auth/auth-context";
import { SiteNav, SiteFooter } from "@/components/site-chrome";
import "./globals.css";
import "./tools/hpi-potsdam/landing.css";
import "./tools/hpi-potsdam/overrides.css";

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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.z1ha0.com";
const SITE_DESC =
  "以论文为核心、本地优先的研究工作台：检索 → 精读 → 提炼 → 立论 → 撰写 → 制图，一条二字动词链串成打通的论文主线，上游产出即下游输入。PaperWeave 只搭骨架不代写正文，让每一步都顺起来。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "PaperWeave · 研究型论文助手", template: "%s · PaperWeave" },
  description: SITE_DESC,
  applicationName: "PaperWeave",
  keywords: [
    "论文检索", "文献阅读", "arXiv", "OpenAlex", "研究工作流",
    "AI 论文助手", "引用网络", "语义检索", "RAG", "PaperWeave",
  ],
  authors: [{ name: "PaperWeave" }],
  openGraph: {
    type: "website",
    siteName: "PaperWeave",
    title: "PaperWeave · 研究型论文助手",
    description: SITE_DESC,
    locale: "zh_CN",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "PaperWeave · 研究型论文助手",
    description: SITE_DESC,
  },
  robots: { index: true, follow: true },
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
        <AuthProvider>
          <div className="relative z-10 flex min-h-full flex-col">
            <SiteNav />
            <main className="flex-1 flex flex-col">{children}</main>
            <SiteFooter />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
