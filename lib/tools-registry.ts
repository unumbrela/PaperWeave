export type Phase =
  | "查论文"
  | "读文献"
  | "生 idea"
  | "做验证"
  | "论文绘图"
  | "讲结果"
  | "可视化表达"
  | "资产";

export type Tool = {
  slug: string;
  name: string;
  description: string;
  phases: Phase[];
  icon: string;
  gradient: string;
  href: string;
  comingSoon?: boolean;
};

export const TOOLS: Tool[] = [
  // ── 查论文 ──────────────────────────────────────────────
  {
    slug: "paper-search",
    name: "论文调研搜索",
    description:
      "从关键词或领域出发，调 arXiv 拉候选论文，整理成可继续处理的论文库。预设关键词包 + 自定义领域。",
    phases: ["查论文"],
    icon: "🔎",
    gradient: "from-[#ff4f8b] to-[#b14bff]",
    href: "/tools/paper-search",
  },

  // ── 读文献 ──────────────────────────────────────────────
  {
    slug: "summarize",
    name: "文献网页速读器",
    description: "粘贴 URL，拿到 30 秒能读完的结构化要点与关键引述。",
    phases: ["读文献"],
    icon: "📰",
    gradient: "from-[#ff4f8b] to-[#b14bff]",
    href: "/tools/summarize",
  },
  {
    slug: "markdown-convert",
    name: "论文资料整理器",
    description:
      "拖拽批量上传 Word/PDF/HTML/TXT，本地解析输出带 LaTeX 公式与表格的干净 Markdown。",
    phases: ["读文献"],
    icon: "📄",
    gradient: "from-[#4bb3ff] to-[#b14bff]",
    href: "/tools/markdown-convert",
  },
  {
    slug: "markdown-summarize",
    name: "论文内容结构化总结",
    description:
      "输入一篇论文的 Markdown，结构化提取关键点、方法、实验设置、引文，便于后续串联与对比。",
    phases: ["读文献"],
    icon: "📚",
    gradient: "from-[#6b8ed6] to-[#4bb3ff]",
    href: "/tools/markdown-summarize",
  },

  // ── 生 idea ─────────────────────────────────────────────
  {
    slug: "idea-generator",
    name: "Idea 生成器",
    description:
      "基于参考论文与可用资源，输出有差异化假设、最小验证实验、风险清单的研究 idea。",
    phases: ["生 idea"],
    icon: "💡",
    gradient: "from-[#f59e0b] to-[#ec4899]",
    href: "/tools/idea-generator",
  },

  // ── 做验证 ──────────────────────────────────────────────
  {
    slug: "prompt-chunker",
    name: "研究任务规划器",
    description:
      "把一个模糊的研究想法拆成原子子问题 + 验收清单 + 可直接执行的 Runbook。小模型也能稳跑。",
    phases: ["做验证"],
    icon: "🧩",
    gradient: "from-[#f59e0b] to-[#ec4899]",
    href: "/tools/prompt-chunker",
  },
  {
    slug: "skill-maker",
    name: "研究自动化封装器",
    description:
      "描述需求，产出可直接落地到 ~/.claude/skills 的 SKILL.md。也可用来封装论文绘图流程。",
    phases: ["做验证", "论文绘图"],
    icon: "🧰",
    gradient: "from-[#ff4f8b] to-[#4b8bff]",
    href: "/tools/skill-maker",
  },

  // ── 讲结果 ──────────────────────────────────────────────
  {
    slug: "cnn-explainer",
    name: "经典模型 · CNN 端到端讲解",
    description:
      "交互式理解卷积神经网络：真实的 tiny-VGG 在浏览器里跑推理，一层层看 feature map 如何流动。",
    phases: ["讲结果"],
    icon: "🧠",
    gradient: "from-[#f4c25a] to-[#3b6ef6]",
    href: "/tools/cnn-explainer",
  },
  {
    slug: "med-seg-explainer",
    name: "经典模型 · 医学图像分割",
    description:
      "端到端剖析 FWMamba-UNet：从输入到 DWT 小波分解、编码器、EAFF-Skip、最终掩膜，真实中间层激活一次看清。",
    phases: ["讲结果"],
    icon: "🩻",
    gradient: "from-[#6b8ed6] to-[#f4c25a]",
    href: "/tools/med-seg-explainer",
  },
  {
    slug: "transformer-explainer",
    name: "经典模型 · Transformer 可视化",
    description:
      "交互式理解 Transformer 架构：从输入嵌入、多头注意力机制、残差连接到输出，逐层解析注意力权重的变化。",
    phases: ["讲结果"],
    icon: "🔗",
    gradient: "from-[#f4c25a] to-[#ec4899]",
    href: "/tools/transformer-explainer",
  },
  {
    slug: "gan-explainer",
    name: "经典模型 · GAN 生成对抗网络",
    description:
      "端到端探索生成对抗网络：观察 Generator 与 Discriminator 的博弈过程，可视化中间特征图的演变。",
    phases: ["讲结果"],
    icon: "⚔️",
    gradient: "from-[#10b981] to-[#f4c25a]",
    href: "/tools/gan-explainer",
    comingSoon: false,
  },
  {
    slug: "diffusion-explainer",
    name: "经典模型 · 扩散模型",
    description:
      "直观理解扩散模型的去噪过程：从随机噪声开始，逐步观察每一步去噪后图像的变化，理解时间步的作用。",
    phases: ["讲结果"],
    icon: "🌀",
    gradient: "from-[#8b5cf6] to-[#f4c25a]",
    href: "/tools/diffusion-explainer",
    comingSoon: false,
  },

  // ── 可视化表达 ───────────────────────────────────────────
  {
    slug: "hpi-potsdam",
    name: "科研项目交互叙事 · iGEM",
    description:
      "HPI Potsdam 2025 iGEM BioComplete 主页：Three.js 3D 星图 + 三段式滚动叙事。附中文解读与迁移思路（物理位场 / 单细胞 embedding 等）。",
    phases: ["可视化表达"],
    icon: "🧬",
    gradient: "from-[#4cc9f0] to-[#7c3aed]",
    href: "/tools/hpi-potsdam",
  },

  // ── 资产 · 即插即用网页美化 / 复刻案例 / 通用工具 ───────────
  {
    slug: "beautiful-aurora",
    name: "The Beautiful Aurora",
    description:
      "黑底舞台 + 4 团 morphing blur 色块穿过标题，靠 blend mode 让字体颜色持续动态变化。即插即用。",
    phases: ["资产"],
    icon: "🌌",
    gradient: "from-[#00c2ff] to-[#e54cff]",
    href: "/tools/beautiful-aurora",
  },
  {
    slug: "web-beautifier",
    name: "Web Beautifier",
    description:
      "开箱即用的背景与动效组件集：Raycast / Trae 同款、Mesh Orbs 等，复制即用、零依赖。",
    phases: ["资产"],
    icon: "🪩",
    gradient: "from-[#ff3d7f] to-[#3b6ef6]",
    href: "/tools/web-beautifier",
  },
  {
    slug: "toolbox-background",
    name: "暖色动态背景",
    description:
      "当前首页的暖纸面动态背景：5 团 radial blob 慢速漂移 + grain 颗粒层，附中文拆解。",
    phases: ["资产"],
    icon: "🌤️",
    gradient: "from-[#ffb4a2] to-[#a9d6ff]",
    href: "/tools/toolbox-background",
  },
  {
    slug: "fluid-sim",
    name: "流体模拟 · Fluid Simulation",
    description:
      "原样移植 Pavel Dobryakov 的 16k-star 经典：GPU Navier–Stokes 实时流体 + Bloom + Sunrays。",
    phases: ["资产"],
    icon: "🌊",
    gradient: "from-[#ff4f8b] to-[#4bb3ff]",
    href: "/tools/fluid-sim",
  },
  {
    slug: "hamish-portfolio",
    name: "Hamish Portfolio · 位移球体",
    description:
      "从 HamishMW/portfolio 抽取核心 Intro：MeshPhongMaterial + Perlin noise 位移球体 + 片假名解码文字动画。",
    phases: ["资产"],
    icon: "🪐",
    gradient: "from-[#0ea5e9] to-[#8b5cf6]",
    href: "/tools/hamish-portfolio",
  },
  {
    slug: "bruno-folio",
    name: "Bruno Simon · 3D 沙盒",
    description:
      "Bruno Simon 传奇 3D 沙盒作品集 folio-2019：页面内嵌原站，配中文源码解读。",
    phases: ["资产"],
    icon: "🚗",
    gradient: "from-[#f97316] to-[#facc15]",
    href: "/tools/bruno-folio",
  },
  {
    slug: "algorithm-visualizer",
    name: "算法可视化",
    description:
      "交互式算法可视化集合：全排列决策树、链表反转、最长递增子序列等，逐步动画 + C++ 代码高亮。",
    phases: ["资产"],
    icon: "🌳",
    gradient: "from-[#4CAF50] to-[#9C27B0]",
    href: "/tools/algorithm-visualizer",
  },
  {
    slug: "explain-code",
    name: "代码解释器",
    description: "粘贴代码，得到逐段讲解、复杂度分析与潜在坑位提示。",
    phases: ["资产"],
    icon: "🔎",
    gradient: "from-[#b14bff] to-[#4b8bff]",
    href: "/tools/explain-code",
  },
  {
    slug: "optimize-prompt",
    name: "提示词优化器",
    description: "把粗糙 prompt 升级成结构化版本，附改动说明。",
    phases: ["资产"],
    icon: "✨",
    gradient: "from-[#4b8bff] to-[#ff4f8b]",
    href: "/tools/optimize-prompt",
  },
];

export const PHASES: ("全部" | Phase)[] = [
  "全部",
  "查论文",
  "读文献",
  "生 idea",
  "做验证",
  "论文绘图",
  "讲结果",
  "可视化表达",
  "资产",
];

// 仅主线 7 环（不含「全部」「资产」）用于首页 Workflow 走廊
export const WORKFLOW_PHASES: Phase[] = [
  "查论文",
  "读文献",
  "生 idea",
  "做验证",
  "论文绘图",
  "讲结果",
  "可视化表达",
];

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function getToolsInPhase(phase: Phase): Tool[] {
  return TOOLS.filter((t) => t.phases.includes(phase));
}
