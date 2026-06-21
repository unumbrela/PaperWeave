// 以论文为核心的工作流主线 5 环：检索 → 精读 → 立论 → 撰写 → 制图。
// 阶段标签统一为二字动词，与首页主线动词链（检索·精读·提炼·立论·撰写·制图）同源；
// 「提炼」是精读环内的结构化要点工序，故并入「精读」阶段。命令行/自动化工具迁入 lab。
export type Phase =
  | "检索"
  | "精读"
  | "立论"
  | "撰写"
  | "制图";

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
  // ── 检索 ──────────────────────────────────────────────
  {
    slug: "paper-search",
    name: "文献检索",
    description:
      "从关键词或领域出发，多源并发检索 + LLM 查询扩展（不重不漏），整理成可继续处理的论文库。预设关键词包 + 自定义领域 + 最新优先。",
    phases: ["检索"],
    track: "workflow",
    icon: "🔎",
    gradient: "from-[#ff4f8b] to-[#b14bff]",
    href: "/tools/paper-search",
  },
  {
    slug: "citation-graph",
    name: "引文网络图谱",
    description:
      "输入一篇论文（OpenAlex），用 D3 力导向图展开它的引用网络：参考文献 + 被引文献一张图，圆越大被引越多。从检索结果一键直达。",
    phases: ["检索"],
    track: "workflow",
    icon: "🕸️",
    gradient: "from-[#b14bff] to-[#4bb3ff]",
    href: "/tools/citation-graph",
  },
  {
    slug: "research-genealogy",
    name: "研究脉络族谱",
    description:
      "图谱看单篇，族谱看方向：配套 Claude Code skill 深度调研一个方向的发展脉络（奠基 → 路线分叉 → 前沿，引文边均经核验），产出的 lineage.json 在本页渲染成可点击的族谱树。",
    phases: ["检索"],
    track: "workflow",
    icon: "🌳",
    gradient: "from-[#2e9e6b] to-[#b14bff]",
    href: "/tools/research-genealogy",
  },

  // ── 精读（含提炼工序）────────────────────────────────────
  {
    slug: "summarize",
    name: "网页文献速览",
    description: "粘贴 URL，拿到 30 秒能读完的结构化要点与关键引述。",
    phases: ["精读"],
    track: "workflow",
    icon: "📰",
    gradient: "from-[#ff4f8b] to-[#b14bff]",
    href: "/tools/summarize",
  },
  {
    slug: "markdown-convert",
    name: "文献格式转译",
    description:
      "拖拽批量上传 Word/PDF/HTML/TXT，本地解析输出带 LaTeX 公式与表格的干净 Markdown。",
    phases: ["精读"],
    track: "workflow",
    icon: "📄",
    gradient: "from-[#4bb3ff] to-[#b14bff]",
    href: "/tools/markdown-convert",
  },
  {
    slug: "markdown-summarize",
    name: "要点提炼",
    description:
      "输入一篇论文的 Markdown，结构化提炼关键点、方法、实验设置、引文，便于后续串联与对比。",
    phases: ["精读"],
    track: "workflow",
    icon: "📚",
    gradient: "from-[#6b8ed6] to-[#4bb3ff]",
    href: "/tools/markdown-summarize",
  },
  {
    slug: "paper-compare",
    name: "文献对比矩阵",
    description:
      "从论文库勾选 2-6 篇，AI 生成「研究问题/方法/数据集/指标/创新点/局限」横向对比矩阵，一键导出 Markdown，综述写作刚需。",
    phases: ["精读"],
    track: "workflow",
    icon: "📊",
    gradient: "from-[#4bb3ff] to-[#6b8ed6]",
    href: "/tools/paper-compare",
  },
  {
    slug: "library-qa",
    name: "文库问答",
    description:
      "对入库论文建语义索引，用自然语言提问（embedding 检索 + LLM 归纳），返回带引用、可溯源到具体论文的答案。无 embedding key 时自动降级本地关键词检索。",
    phases: ["精读"],
    track: "workflow",
    icon: "💬",
    gradient: "from-[#b14bff] to-[#6b8ed6]",
    href: "/tools/library-qa",
  },

  // ── 立论 ────────────────────────────────────────────────
  {
    slug: "idea-generator",
    name: "创新点立论",
    description:
      "先拆解参考论文的现有创新点与局限，再在其之上立起有差异化假设、最小验证实验、风险清单的新研究创新点。",
    phases: ["立论"],
    track: "workflow",
    icon: "💡",
    gradient: "from-[#f59e0b] to-[#ec4899]",
    href: "/tools/idea-generator",
  },

  // ── 撰写 ────────────────────────────────────────────────
  {
    slug: "paper-writer",
    name: "结构撰写",
    description:
      "把创新点、参考论文与精读产出组织成论文结构：章节大纲 + 每节要点 + Related Work 分组 + 每段写作脚手架（主题句/应含要点/过渡）。只搭骨架与表述建议，不替你写正文。",
    phases: ["撰写"],
    track: "workflow",
    icon: "✍️",
    gradient: "from-[#ec4899] to-[#f59e0b]",
    href: "/tools/paper-writer",
  },

  // ── 制图 ────────────────────────────────────────────────
  {
    slug: "figure-generator",
    name: "图表制图",
    description:
      "描述想画的图（可附数据），生成可直接运行的出版级绘图代码：matplotlib / seaborn / plotly / TikZ，内置色盲友好配色、期刊单双栏尺寸与投稿自查清单。",
    phases: ["制图"],
    track: "workflow",
    icon: "📈",
    gradient: "from-[#10b981] to-[#4bb3ff]",
    href: "/tools/figure-generator",
  },
  {
    slug: "figure-prompt",
    name: "科研示意图提示词",
    description:
      "把主题与要展示的内容，组织成可直接粘贴给文生图模型（DALL·E / Midjourney / 即梦等）的科研图形摘要 / 示意图提示词：横向流程、矢量插画质感、配色语义、克制约束一应俱全。",
    phases: ["制图"],
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
      "像玩 GAN Lab 一样玩扩散模型：选或自绘二维目标分布，看前向加噪与反向去噪的真实采样轨迹，调节噪声调度与采样器。",
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
    name: "研究任务分解",
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
    name: "技能封装",
    description:
      "描述需求，产出可直接落地到 ~/.claude/skills 的 SKILL.md。也可用来封装论文绘图流程。",
    phases: [],
    track: "lab",
    icon: "🧰",
    gradient: "from-[#ff4f8b] to-[#4b8bff]",
    href: "/tools/skill-maker",
  },
];

// ── 核心论文流程（首页主线）────────────────────────────────
// 围绕「一篇论文」的线性旅程，二字动词链：检索 → 精读 → 提炼 → 立论 → 撰写 → 制图。
// 这是首页一上来就展示的核心；其余工具（配套 / lab / 展厅）一律下放。
// 与 Phase/Track 解耦：Phase 用于分类与 handoff，CORE_FLOW 是面向用户的旅程地图。
export type CoreStep = {
  /** 步骤名（首页大字） */
  title: string;
  /** 一句话角色说明 */
  blurb: string;
  /** 目标路由（工具页或 /library 等核心页面） */
  href: string;
  icon: string;
  /** 对应工具 slug（工具页才有）；用于把核心工具从「配套工具」中排除，避免重复露出。 */
  toolSlug?: string;
};

export const CORE_FLOW: CoreStep[] = [
  {
    title: "检索",
    blurb: "多源并发检索最新论文，LLM 查询扩展不重不漏，逐篇定位 + 一句话速览入库。",
    href: "/tools/paper-search",
    icon: "🔎",
    toolSlug: "paper-search",
  },
  {
    title: "精读",
    blurb: "导入论文库，PDF 精读批注，挑出真正值得深读的那一篇。",
    href: "/library",
    icon: "📖",
  },
  {
    title: "提炼",
    blurb: "把精读的论文结构化拆成要点 / 方法 / 实验设置 / 引文，沉淀可复用素材。",
    href: "/tools/markdown-summarize",
    icon: "📚",
    toolSlug: "markdown-summarize",
  },
  {
    title: "立论",
    blurb: "拆解选中论文的现有创新点与局限，在其之上立起可验证的差异化新创新点。",
    href: "/tools/idea-generator",
    icon: "💡",
    toolSlug: "idea-generator",
  },
  {
    title: "撰写",
    blurb: "把创新点与素材搭成论文结构、逐节要点与段落脚手架（不代写正文）。",
    href: "/tools/paper-writer",
    icon: "✍️",
    toolSlug: "paper-writer",
  },
  {
    title: "制图",
    blurb: "出版级绘图代码 + 文生图科研示意图提示词，把方法与结果画清楚。",
    href: "/tools/figure-generator",
    icon: "📈",
    toolSlug: "figure-generator",
  },
];

/** 核心流程占用的工具 slug 集合（用于从「配套工具」中排除）。 */
export const CORE_FLOW_SLUGS: string[] = CORE_FLOW.map((s) => s.toolSlug).filter(
  (s): s is string => !!s,
);

/** 配套工具 = workflow 工具中不在核心流程里的那些（下放到首页核心流程之下）。 */
export function getSupportingTools(): Tool[] {
  return getWorkflowTools().filter((t) => !CORE_FLOW_SLUGS.includes(t.slug));
}

export const PHASES: ("全部" | Phase)[] = [
  "全部",
  "检索",
  "精读",
  "立论",
  "撰写",
  "制图",
];

// 仅主线 5 环（不含「全部」）用于首页 Workflow 走廊
export const WORKFLOW_PHASES: Phase[] = [
  "检索",
  "精读",
  "立论",
  "撰写",
  "制图",
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
