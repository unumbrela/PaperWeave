export type ToolCategory = "写作" | "编程" | "效率" | "学习";

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
  {
    slug: "skill-maker",
    name: "Skill 生成器",
    description: "描述需求，产出可直接落地到 ~/.claude/skills 的 SKILL.md。",
    category: "效率",
    icon: "🧰",
    gradient: "from-[#ff4f8b] to-[#4b8bff]",
    href: "/tools/skill-maker",
  },
  {
    slug: "markdown-convert",
    name: "Markdown 转换器",
    description: "拖拽批量上传 Word/PDF/HTML/TXT，本地解析输出带 LaTeX 公式与表格的干净 Markdown。",
    category: "效率",
    icon: "📄",
    gradient: "from-[#4bb3ff] to-[#b14bff]",
    href: "/tools/markdown-convert",
  },
  {
    slug: "cnn-explainer",
    name: "CNN 可视化",
    description: "交互式理解卷积神经网络：真实的 tiny-VGG 在浏览器里跑推理，一层层看 feature map 如何流动。",
    category: "学习",
    icon: "🧠",
    gradient: "from-[#f4c25a] to-[#3b6ef6]",
    href: "/tools/cnn-explainer",
  },
  {
    slug: "web-beautifier",
    name: "Web Beautifier",
    description: "开箱即用的背景与动效组件集：Raycast / Trae 同款、Mesh Orbs 等，复制即用、零依赖。",
    category: "效率",
    icon: "🪩",
    gradient: "from-[#ff3d7f] to-[#3b6ef6]",
    href: "/tools/web-beautifier",
  },
  {
    slug: "hpi-potsdam",
    name: "HPI Potsdam · iGEM 首页",
    description:
      "原样移植 HPI Potsdam 2025 iGEM 团队 BioComplete 主页：Three.js 3D 星图漫游 Registry 嵌入空间 + 三段式滚动叙事，附中文解读。",
    category: "学习",
    icon: "🧬",
    gradient: "from-[#4cc9f0] to-[#7c3aed]",
    href: "/tools/hpi-potsdam",
  },
  {
    slug: "med-seg-explainer",
    name: "医学图像分割 · 可视化",
    description: "端到端剖析 FWMamba-UNet：从输入到 DWT 小波分解、编码器、EAFF-Skip、最终掩膜，真实中间层激活一次看清。",
    category: "学习",
    icon: "🩻",
    gradient: "from-[#6b8ed6] to-[#f4c25a]",
    href: "/tools/med-seg-explainer",
  },
];

export const CATEGORIES: ("全部" | ToolCategory)[] = [
  "全部",
  "写作",
  "编程",
  "效率",
  "学习",
];

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
