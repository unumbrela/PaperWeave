export type ToolCategory = "写作" | "编程" | "效率";

export type Tool = {
  slug: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: string;
  gradient: string;
  href: string;
};

export const TOOLS: Tool[] = [
  {
    slug: "summarize",
    name: "网页摘要器",
    description: "粘贴 URL，拿到 30 秒能读完的结构化要点与关键引述。",
    category: "写作",
    icon: "📰",
    gradient: "from-[#ff4f8b] to-[#b14bff]",
    href: "/tools/summarize",
  },
  {
    slug: "explain-code",
    name: "代码解释器",
    description: "粘贴代码，得到逐段讲解、复杂度分析与潜在坑位提示。",
    category: "编程",
    icon: "🔎",
    gradient: "from-[#b14bff] to-[#4b8bff]",
    href: "/tools/explain-code",
  },
  {
    slug: "optimize-prompt",
    name: "提示词优化器",
    description: "把粗糙 prompt 升级成结构化版本，附改动说明。",
    category: "效率",
    icon: "✨",
    gradient: "from-[#4b8bff] to-[#ff4f8b]",
    href: "/tools/optimize-prompt",
  },
];

export const CATEGORIES: ("全部" | ToolCategory)[] = [
  "全部",
  "写作",
  "编程",
  "效率",
];

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
