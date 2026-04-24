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
    slug: "prompt-chunker",
    name: "任务拆解器",
    description:
      "粘贴一段复杂任务，自动拆成原子子问题 + 验收清单 + 可直接执行的 Runbook。小模型也能稳跑。",
    category: "效率",
    icon: "🧩",
    gradient: "from-[#f59e0b] to-[#ec4899]",
    href: "/tools/prompt-chunker",
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
  {
    slug: "fluid-sim",
    name: "流体模拟 · Fluid Simulation",
    description:
      "原样移植 Pavel Dobryakov 的 16k-star 经典：GPU Navier–Stokes 实时流体 + Bloom + Sunrays，鼠标拖动喷发光液，附中文源码解读。",
    category: "学习",
    icon: "🌊",
    gradient: "from-[#ff4f8b] to-[#4bb3ff]",
    href: "/tools/fluid-sim",
  },
  {
    slug: "hamish-portfolio",
    name: "Hamish Portfolio · 位移球体首页",
    description:
      "从 HamishMW/portfolio 抽取核心 Intro：MeshPhongMaterial + onBeforeCompile 注入的 Perlin noise 位移球体 + 片假名解码文字动画，附中文源码解读。",
    category: "学习",
    icon: "🪐",
    gradient: "from-[#0ea5e9] to-[#8b5cf6]",
    href: "/tools/hamish-portfolio",
  },
  {
    slug: "bruno-folio",
    name: "Bruno Simon · 3D 沙盒作品集",
    description:
      "Bruno Simon 传奇 3D 沙盒作品集 folio-2019：页面内嵌原站，配中文源码解读，拆解 Zones / Tiles / Areas / Physics 多层架构。",
    category: "学习",
    icon: "🚗",
    gradient: "from-[#f97316] to-[#facc15]",
    href: "/tools/bruno-folio",
  },
  {
    slug: "beautiful-aurora",
    name: "The Beautiful Aurora",
    description:
      "参考 CodePen《The Aurora》实现：黑底舞台 + 4 团 morphing blur 色块穿过标题，利用 blend mode 让字体颜色持续动态变化。",
    category: "学习",
    icon: "🌌",
    gradient: "from-[#00c2ff] to-[#e54cff]",
    href: "/tools/beautiful-aurora",
  },
  {
    slug: "toolbox-background",
    name: "Toolbox 首页动态背景",
    description:
      "把当前项目首页的暖纸面动态背景单独拆出来：5 团 radial blob 慢速漂移 + grain 颗粒层，上方实时展示，下方中文拆解实现方式。",
    category: "学习",
    icon: "🌤️",
    gradient: "from-[#ffb4a2] to-[#a9d6ff]",
    href: "/tools/toolbox-background",
  },
  {
    slug: "algorithm-visualizer",
    name: "算法可视化",
    description:
      "交互式算法可视化集合：全排列决策树、链表反转、最长递增子序列等，逐步动画 + C++ 代码高亮 + 状态面板辅助理解经典算法。",
    category: "学习",
    icon: "🌳",
    gradient: "from-[#4CAF50] to-[#9C27B0]",
    href: "/tools/algorithm-visualizer",
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
