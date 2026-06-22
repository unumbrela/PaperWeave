// 以论文为核心的工作流主线 6 环：检索 → 精读 → 梳理 → 立论 → 撰写 → 制图。
// 阶段标签统一为二字动词，与首页主线动词链（检索·精读·梳理·立论·撰写·制图）同源。
// 「梳理」= 整理研究方向、梳理整个方向的发展历程（research-genealogy）；
// 「提炼」是精读环内的结构化要点工序，故并入「精读」阶段。命令行/自动化工具迁入 lab。
export type Phase =
  | "检索"
  | "精读"
  | "梳理"
  | "立论"
  | "撰写"
  | "制图";

// workflow：挂在 6 环主线、参与一键流转闭环的工具（核心步骤 + 围绕主干的配套）。
// utility：与主干松耦合的外围工具（网页速览 / 文库问答 / 格式转译），首页下放到 Utilities 区，phases 为空。
// gallery：交互式教学演示（模型可视化 / 科研叙事），独立于工作流，不参与阶段过滤与 handoff。
// lab：命令行 / 自动化扩展（任务规划器 / 自动化封装器），独立于论文主线，phases 为空。
export type Track = "workflow" | "utility" | "gallery" | "lab";

export type Tool = {
  slug: string;
  name: string;
  description: string;
  /** workflow 工具挂在 6 环主线；utility / gallery / lab 工具不属于任何工作流阶段（phases 为空）。 */
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
  // ── 梳理（整理方向 · 梳理发展历程）──────────────────────
  {
    slug: "research-genealogy",
    name: "研究脉络族谱",
    description:
      "梳理整个方向的发展历程：输入研究方向一键生成发展谱系（奠基 → 路线分叉 → 前沿，引文边均经核验），看清谁在谁之上、哪些路线并行、最新前沿在哪、空白在哪。也可在终端跑同名 skill 做深度调研后粘贴 lineage.json。",
    phases: ["梳理"],
    track: "workflow",
    icon: "🌳",
    gradient: "from-[#2e9e6b] to-[#b14bff]",
    href: "/tools/research-genealogy",
  },

  // ── 精读（含提炼工序）────────────────────────────────────
  {
    slug: "markdown-summarize",
    name: "要点提炼",
    description:
      "输入一篇论文的 Markdown，结构化提炼方法、实验与引文，并读出「创新点画像 + 局限留白」，再用八个创新算子把留白系统化衍生成可验证的新创新方向，直接喂给「创新点立论」。",
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
      "从论文库勾选 2-6 篇，AI 生成「研究问题/方法/数据集/指标/创新点/局限」横向对比矩阵，一键导出 Markdown——横向对比是梳理一个方向、看清路线分叉的刚需。",
    phases: ["梳理"],
    track: "workflow",
    icon: "📊",
    gradient: "from-[#4bb3ff] to-[#6b8ed6]",
    href: "/tools/paper-compare",
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
      "把创新点、参考论文与精读产出组织成论文结构：一句话故事线 + 章节大纲 + 每段写作脚手架（主题句意图/应含要点/过渡 + 英文 topic sentence 模板）+ Related Work 分组 + 投稿自查清单。方法论源自《英语科技写作》与 learning_research，内置端到端示例与方法论面板。只搭骨架，不替你写正文。",
    phases: ["撰写"],
    track: "workflow",
    icon: "✍️",
    gradient: "from-[#ec4899] to-[#f59e0b]",
    href: "/tools/paper-writer",
  },

  // ── 制图 ────────────────────────────────────────────────
  {
    slug: "figure-prompt",
    name: "科研绘图",
    description:
      "两类图一站搞定：① 科研示意图——把主题与内容组织成可粘贴给文生图模型（DALL·E / Midjourney / 即梦）的图形摘要提示词；② 架构流程图——AI 直接产出 draw.io 图（架构/流程/时序/ER 等），站内预览并可下载 .drawio。",
    phases: ["制图"],
    track: "workflow",
    icon: "🎨",
    gradient: "from-[#4bb3ff] to-[#b14bff]",
    href: "/tools/figure-prompt",
  },

  // ── 外围工具（utility）：与主干松耦合，首页下放到 Utilities 区 ──────
  {
    slug: "summarize",
    name: "网页文献速览",
    description: "粘贴 URL，拿到 30 秒能读完的结构化要点与关键引述。",
    phases: [],
    track: "utility",
    icon: "📰",
    gradient: "from-[#ff4f8b] to-[#b14bff]",
    href: "/tools/summarize",
  },
  {
    slug: "library-qa",
    name: "文库问答",
    description:
      "对入库论文建语义索引，用自然语言提问（embedding 检索 + LLM 归纳），返回带引用、可溯源到具体论文的答案。无 embedding key 时自动降级本地关键词检索。",
    phases: [],
    track: "utility",
    icon: "💬",
    gradient: "from-[#b14bff] to-[#6b8ed6]",
    href: "/tools/library-qa",
  },
  {
    slug: "markdown-convert",
    name: "文献格式转译",
    description:
      "拖拽批量上传 Word/PDF/HTML/TXT，本地解析输出带 LaTeX 公式与表格的干净 Markdown。",
    phases: [],
    track: "utility",
    icon: "📄",
    gradient: "from-[#4bb3ff] to-[#b14bff]",
    href: "/tools/markdown-convert",
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
      "端到端流水线：看一句话如何被算成「下一个词」。分词→嵌入→自注意力→多头→前馈→堆叠→输出概率，每步配可交互的图。",
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
    name: "经典模型 · Flow Matching",
    description:
      "像玩 GAN Lab 一样玩 Flow Matching：选或自绘二维目标分布，看噪声如何顺着速度场流成数据，并理解 Rectified Flow 如何把轨迹拉直、实现少步生成。",
    phases: [],
    track: "gallery",
    icon: "🌀",
    gradient: "from-[#8b5cf6] to-[#f4c25a]",
    href: "/tools/diffusion-explainer",
  },
  {
    slug: "stable-diffusion-explainer",
    name: "生成模型 · Stable Diffusion",
    description:
      "把扩散模型讲清楚：从一团噪声出发，亲手体验反向去噪、文字牵引与前向加噪三个互动，理解时间步 / 引导强度 / 随机种子如何塑造成图。",
    phases: [],
    track: "gallery",
    icon: "🎨",
    gradient: "from-[#ec4899] to-[#f4c25a]",
    href: "/tools/stable-diffusion-explainer",
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
// 围绕「一篇论文 / 一个方向」的线性旅程，二字动词链：检索 → 精读 → 梳理 → 立论 → 撰写 → 制图。
// 这是首页一上来就展示的核心；其余工具（配套 / utility / lab / 展厅）一律下放。
// 与 Phase/Track 解耦：Phase 用于分类与 handoff，CORE_FLOW 是面向用户的旅程地图。
export type CoreStep = {
  /** 步骤名（首页大字） */
  title: string;
  /** 一句话角色说明 */
  blurb: string;
  /** 目标路由（工具页或 /library 等核心页面） */
  href: string;
  icon: string;
  /** 该环的主色（首页「织线长卷」逐站染色，暖→冷→暖推进，沿用 tool-card accent）。 */
  accent: string;
  /** 这一步「吃进」什么（首页工序卡左项，极简短语）。 */
  input: string;
  /** 这一步「产出」什么（首页工序卡右项）——即下一步的输入，显性化流水线。 */
  output: string;
  /** 对应工具 slug（工具页才有）；用于把核心工具从「配套工具」中排除，避免重复露出。 */
  toolSlug?: string;
};

export const CORE_FLOW: CoreStep[] = [
  {
    title: "检索",
    blurb: "多源并发检索最新论文，LLM 查询扩展不重不漏，逐篇定位 + 一句话速览入库。",
    href: "/tools/paper-search",
    icon: "🔎",
    accent: "#b14bff",
    input: "关键词 · 领域",
    output: "论文库条目",
    toolSlug: "paper-search",
  },
  {
    title: "精读",
    blurb: "一键速览总结，把感兴趣的论文加入文献索引库，再在线 PDF 精读批注、做笔记。",
    href: "/library",
    icon: "📖",
    accent: "#4bb3ff",
    input: "论文库 · PDF",
    output: "批注 · 精读笔记",
  },
  {
    title: "梳理",
    blurb: "整理研究方向、梳理整个方向的发展历程：输入方向一键生成发展谱系，看清路线分叉、最新前沿与研究空白。",
    href: "/tools/research-genealogy",
    icon: "🌳",
    accent: "#2e9e6b",
    input: "方向 · 论文库",
    output: "发展谱系 · 研究空白",
    toolSlug: "research-genealogy",
  },
  {
    title: "立论",
    blurb: "两条创新来源：把新论文里读到的可迁移方法/架构搬到自己领域，或从梳理后发现的研究空白切入——立起可验证的差异化创新点。",
    href: "/tools/idea-generator",
    icon: "💡",
    accent: "#f59e0b",
    input: "可迁移方法 · 研究空白",
    output: "假设 · 验证实验",
    toolSlug: "idea-generator",
  },
  {
    title: "撰写",
    blurb: "把创新点与素材搭成论文结构、逐节要点与段落脚手架（不代写正文）。",
    href: "/tools/paper-writer",
    icon: "✍️",
    accent: "#ec4899",
    input: "创新点 · 素材",
    output: "结构 · 段落脚手架",
    toolSlug: "paper-writer",
  },
  {
    title: "制图",
    blurb: "两类图一站搞定：文生图科研示意图提示词 + AI 直出 draw.io 架构/流程图，把方法与结果画清楚。",
    href: "/tools/figure-prompt",
    icon: "🎨",
    accent: "#10b981",
    input: "方法 · 数据",
    output: "出版级图表",
    toolSlug: "figure-prompt",
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
  "梳理",
  "立论",
  "撰写",
  "制图",
];

// 仅主线 6 环（不含「全部」）用于首页 Workflow 走廊
export const WORKFLOW_PHASES: Phase[] = [
  "检索",
  "精读",
  "梳理",
  "立论",
  "撰写",
  "制图",
];

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

// ── 链路位置推导 ────────────────────────────────────────────
// 让 6 环闭环在 UI 上显性化：每个 workflow 工具能算出自己处在第几环、
// 上游/下游代表工具是谁（见 components/workflow/WorkflowRail.tsx）。
// gallery 工具（phases 为空）不参与链路，相关函数返回 undefined。

/** 工具的主环（phases[0]）。 */
export function getPrimaryPhase(tool: Tool): Phase | undefined {
  return tool.phases[0];
}

/** 6 环顺序中的序号（0-based），非工作流环返回 -1。 */
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

// 工作流工具：挂在 6 环主线、参与一键流转闭环。
export function getWorkflowTools(): Tool[] {
  return TOOLS.filter((t) => t.track === "workflow");
}

// 外围工具：与主干松耦合（网页速览 / 文库问答 / 格式转译），首页下放到 Utilities 区。
export function getUtilityTools(): Tool[] {
  return TOOLS.filter((t) => t.track === "utility");
}

// 展厅工具：交互式教学演示，独立于工作流。
export function getGalleryTools(): Tool[] {
  return TOOLS.filter((t) => t.track === "gallery");
}

// lab 工具：命令行 / 自动化扩展，独立于论文主线。
export function getLabTools(): Tool[] {
  return TOOLS.filter((t) => t.track === "lab");
}
