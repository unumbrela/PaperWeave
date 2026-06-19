// 以论文为核心的工作流主线 5 环：调研搜索 → 精读定位 → 创新点 → 组织撰写 → 论文绘图。
// 旧标签（查论文/读文献/生 idea/做验证）已重排为论文主线叙事；做验证向的命令行工具迁入 lab。
export type Phase =
  | "调研搜索"
  | "精读定位"
  | "创新点"
  | "组织撰写"
  | "论文绘图";

// workflow：挂在 5 环主线、参与一键流转闭环的工具。
// gallery：交互式教学演示（模型可视化 / 科研叙事），独立于工作流，不参与阶段过滤与 handoff。
// lab：命令行 / 自动化扩展（任务规划器 / 自动化封装器），独立于论文主线，phases 为空。
export type Track = "workflow" | "gallery" | "lab";

export type Tool = {
  slug: string;
  name: string;
  description: string;
  /** workflow 工具挂在 5 环主线；gallery 工具不属于任何工作流阶段（phases 为空）。 */
  phases: Phase[];
  track: Track;
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
      "从关键词或领域出发，多源并发检索 + LLM 查询扩展（不重不漏），整理成可继续处理的论文库。预设关键词包 + 自定义领域 + 最新优先。",
    phases: ["调研搜索"],
    track: "workflow",
    icon: "🔎",
    gradient: "from-[#ff4f8b] to-[#b14bff]",
    href: "/tools/paper-search",
  },
  {
    slug: "citation-graph",
    name: "引用网络图谱",
    description:
      "输入一篇论文（OpenAlex），用 D3 力导向图展开它的引用网络：参考文献 + 被引文献一张图，圆越大被引越多。从检索结果一键直达。",
    phases: ["调研搜索"],
    track: "workflow",
    icon: "🕸️",
    gradient: "from-[#b14bff] to-[#4bb3ff]",
    href: "/tools/citation-graph",
  },
  {
    slug: "research-genealogy",
    name: "研究方向发展族谱",
    description:
      "图谱看单篇，族谱看方向：配套 Claude Code skill 深度调研一个方向的发展脉络（奠基 → 路线分叉 → 前沿，引文边均经核验），产出的 lineage.json 在本页渲染成可点击的族谱树。",
    phases: ["调研搜索"],
    track: "workflow",
    icon: "🌳",
    gradient: "from-[#2e9e6b] to-[#b14bff]",
    href: "/tools/research-genealogy",
  },

  // ── 读文献 ──────────────────────────────────────────────
  {
    slug: "summarize",
    name: "文献网页速读器",
    description: "粘贴 URL，拿到 30 秒能读完的结构化要点与关键引述。",
    phases: ["精读定位"],
    track: "workflow",
    icon: "📰",
    gradient: "from-[#ff4f8b] to-[#b14bff]",
    href: "/tools/summarize",
  },
  {
    slug: "markdown-convert",
    name: "论文资料整理器",
    description:
      "拖拽批量上传 Word/PDF/HTML/TXT，本地解析输出带 LaTeX 公式与表格的干净 Markdown。",
    phases: ["精读定位"],
    track: "workflow",
    icon: "📄",
    gradient: "from-[#4bb3ff] to-[#b14bff]",
    href: "/tools/markdown-convert",
  },
  {
    slug: "markdown-summarize",
    name: "论文内容结构化总结",
    description:
      "输入一篇论文的 Markdown，结构化提取关键点、方法、实验设置、引文，便于后续串联与对比。",
    phases: ["精读定位"],
    track: "workflow",
    icon: "📚",
    gradient: "from-[#6b8ed6] to-[#4bb3ff]",
    href: "/tools/markdown-summarize",
  },
  {
    slug: "paper-compare",
    name: "多篇论文对比表",
    description:
      "从论文库勾选 2-6 篇，AI 生成「研究问题/方法/数据集/指标/创新点/局限」横向对比矩阵，一键导出 Markdown，综述写作刚需。",
    phases: ["精读定位"],
    track: "workflow",
    icon: "📊",
    gradient: "from-[#4bb3ff] to-[#6b8ed6]",
    href: "/tools/paper-compare",
  },
  {
    slug: "library-qa",
    name: "问你的论文库",
    description:
      "对入库论文建语义索引，用自然语言提问（embedding 检索 + LLM 归纳），返回带引用、可溯源到具体论文的答案。无 embedding key 时自动降级本地关键词检索。",
    phases: ["精读定位"],
    track: "workflow",
    icon: "💬",
    gradient: "from-[#b14bff] to-[#6b8ed6]",
    href: "/tools/library-qa",
  },

  // ── 生 idea ─────────────────────────────────────────────
  {
    slug: "idea-generator",
    name: "Idea 生成器",
    description:
      "基于参考论文与可用资源，输出有差异化假设、最小验证实验、风险清单的研究 idea。",
    phases: ["创新点"],
    track: "workflow",
    icon: "💡",
    gradient: "from-[#f59e0b] to-[#ec4899]",
    href: "/tools/idea-generator",
  },

  // ── 组织撰写 ─────────────────────────────────────────────
  {
    slug: "paper-writer",
    name: "论文撰写组织器",
    description:
      "把创新点、参考论文与精读产出组织成论文结构：章节大纲 + 每节要点 + Related Work 分组 + 每段写作脚手架（主题句/应含要点/过渡）。只搭骨架与表述建议，不替你写正文。",
    phases: ["组织撰写"],
    track: "workflow",
    icon: "✍️",
    gradient: "from-[#ec4899] to-[#f59e0b]",
    href: "/tools/paper-writer",
  },

  // ── 论文绘图 ─────────────────────────────────────────────
  {
    slug: "figure-generator",
    name: "论文绘图代码生成器",
    description:
      "描述想画的图（可附数据），生成可直接运行的出版级绘图代码：matplotlib / seaborn / plotly / TikZ，内置色盲友好配色、期刊单双栏尺寸与投稿自查清单。",
    phases: ["论文绘图"],
    track: "workflow",
    icon: "📈",
    gradient: "from-[#10b981] to-[#4bb3ff]",
    href: "/tools/figure-generator",
  },
  {
    slug: "figure-prompt",
    name: "科研绘图提示词生成器",
    description:
      "把主题与要展示的内容，组织成可直接粘贴给文生图模型（DALL·E / Midjourney / 即梦等）的科研图形摘要 / 示意图提示词：横向流程、矢量插画质感、配色语义、克制约束一应俱全。",
    phases: ["论文绘图"],
    track: "workflow",
    icon: "🎨",
    gradient: "from-[#4bb3ff] to-[#b14bff]",
    href: "/tools/figure-prompt",
  },

  // ── 可视化展厅（gallery）：交互式教学演示，独立于工作流 ──────
  {
    slug: "cnn-explainer",
    name: "经典模型 · CNN 端到端讲解",
    description:
      "交互式理解卷积神经网络：真实的 tiny-VGG 在浏览器里跑推理，一层层看 feature map 如何流动。",
    phases: [],
    track: "gallery",
    icon: "🧠",
    gradient: "from-[#f4c25a] to-[#3b6ef6]",
    href: "/tools/cnn-explainer",
  },
  {
    slug: "med-seg-explainer",
    name: "经典模型 · 医学图像分割",
    description:
      "端到端剖析 FWMamba-UNet：从输入到 DWT 小波分解、编码器、EAFF-Skip、最终掩膜，真实中间层激活一次看清。",
    phases: [],
    track: "gallery",
    icon: "🩻",
    gradient: "from-[#6b8ed6] to-[#f4c25a]",
    href: "/tools/med-seg-explainer",
  },
  {
    slug: "transformer-explainer",
    name: "经典模型 · Transformer 可视化",
    description:
      "交互式理解 Transformer 架构：从输入嵌入、多头注意力机制、残差连接到输出，逐层解析注意力权重的变化。",
    phases: [],
    track: "gallery",
    icon: "🔗",
    gradient: "from-[#f4c25a] to-[#ec4899]",
    href: "/tools/transformer-explainer",
  },
  {
    slug: "gan-explainer",
    name: "经典模型 · GAN 生成对抗网络",
    description:
      "端到端探索生成对抗网络：观察 Generator 与 Discriminator 的博弈过程，可视化中间特征图的演变。",
    phases: [],
    track: "gallery",
    icon: "⚔️",
    gradient: "from-[#10b981] to-[#f4c25a]",
    href: "/tools/gan-explainer",
  },
  {
    slug: "diffusion-explainer",
    name: "经典模型 · 扩散模型",
    description:
      "直观理解扩散模型的去噪过程：从随机噪声开始，逐步观察每一步去噪后图像的变化，理解时间步的作用。",
    phases: [],
    track: "gallery",
    icon: "🌀",
    gradient: "from-[#8b5cf6] to-[#f4c25a]",
    href: "/tools/diffusion-explainer",
  },

  {
    slug: "hpi-potsdam",
    name: "科研项目交互叙事 · iGEM",
    description:
      "HPI Potsdam 2025 iGEM BioComplete 主页：Three.js 3D 星图 + 三段式滚动叙事。附中文解读与迁移思路（物理位场 / 单细胞 embedding 等）。",
    phases: [],
    track: "gallery",
    icon: "🧬",
    gradient: "from-[#4cc9f0] to-[#7c3aed]",
    href: "/tools/hpi-potsdam",
  },

  // ── 命令行 / 自动化扩展（lab）：独立于论文主线的研究自动化工具 ──────
  {
    slug: "prompt-chunker",
    name: "研究任务规划器",
    description:
      "把一个模糊的研究想法拆成原子子问题 + 验收清单 + 可直接执行的 Runbook。小模型也能稳跑。",
    phases: [],
    track: "lab",
    icon: "🧩",
    gradient: "from-[#f59e0b] to-[#ec4899]",
    href: "/tools/prompt-chunker",
  },
  {
    slug: "skill-maker",
    name: "研究自动化封装器",
    description:
      "描述需求，产出可直接落地到 ~/.claude/skills 的 SKILL.md。也可用来封装论文绘图流程。",
    phases: [],
    track: "lab",
    icon: "🧰",
    gradient: "from-[#ff4f8b] to-[#4b8bff]",
    href: "/tools/skill-maker",
  },
];

export const PHASES: ("全部" | Phase)[] = [
  "全部",
  "调研搜索",
  "精读定位",
  "创新点",
  "组织撰写",
  "论文绘图",
];

// 仅主线 5 环（不含「全部」）用于首页 Workflow 走廊
export const WORKFLOW_PHASES: Phase[] = [
  "调研搜索",
  "精读定位",
  "创新点",
  "组织撰写",
  "论文绘图",
];

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

// ── 链路位置推导 ────────────────────────────────────────────
// 让 5 环闭环在 UI 上显性化：每个 workflow 工具能算出自己处在第几环、
// 上游/下游代表工具是谁（见 components/workflow/WorkflowRail.tsx）。
// gallery 工具（phases 为空）不参与链路，相关函数返回 undefined。

/** 工具的主环（phases[0]）。 */
export function getPrimaryPhase(tool: Tool): Phase | undefined {
  return tool.phases[0];
}

/** 5 环顺序中的序号（0-based），非工作流环返回 -1。 */
export function getPhaseIndex(phase: Phase): number {
  return WORKFLOW_PHASES.indexOf(phase);
}

/** 某一环的「代表工具」= 该环内第一个以它为主环的 workflow 工具。 */
export function getPhaseLeadTool(phase: Phase): Tool | undefined {
  return getWorkflowTools().find((t) => t.phases[0] === phase);
}

/** 上游工具：从本工具主环往前找第一个有代表工具的环。 */
export function getUpstreamTool(slug: string): Tool | undefined {
  const tool = getTool(slug);
  const p = tool?.phases[0];
  if (!tool || tool.track !== "workflow" || !p) return undefined;
  for (let i = WORKFLOW_PHASES.indexOf(p) - 1; i >= 0; i--) {
    const lead = getPhaseLeadTool(WORKFLOW_PHASES[i]);
    if (lead) return lead;
  }
  return undefined;
}

/** 下游工具：从本工具主环往后找第一个有代表工具的环。 */
export function getDownstreamTool(slug: string): Tool | undefined {
  const tool = getTool(slug);
  const p = tool?.phases[0];
  if (!tool || tool.track !== "workflow" || !p) return undefined;
  for (let i = WORKFLOW_PHASES.indexOf(p) + 1; i < WORKFLOW_PHASES.length; i++) {
    const lead = getPhaseLeadTool(WORKFLOW_PHASES[i]);
    if (lead) return lead;
  }
  return undefined;
}

export function getToolsInPhase(phase: Phase): Tool[] {
  return TOOLS.filter((t) => t.phases.includes(phase));
}

// 工作流工具：挂在 5 环主线、参与一键流转闭环。
export function getWorkflowTools(): Tool[] {
  return TOOLS.filter((t) => t.track === "workflow");
}

// 展厅工具：交互式教学演示，独立于工作流。
export function getGalleryTools(): Tool[] {
  return TOOLS.filter((t) => t.track === "gallery");
}

// lab 工具：命令行 / 自动化扩展，独立于论文主线。
export function getLabTools(): Tool[] {
  return TOOLS.filter((t) => t.track === "lab");
}
