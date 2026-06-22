/**
 * 「结构撰写」写作方法论 —— 单一事实源。
 *
 * 这里把两套成熟的论文写作方法论沉淀为结构化数据，**同时**喂给：
 *   - 后端 `app/api/paper-writer/route.ts` 的系统/用户提示（保证产出有方法论依据）；
 *   - 前端 `app/tools/paper-writer/page.tsx` 的「写作方法论」折叠参考面板（让用户看得见依据）。
 *
 * 来源：
 *   - 《英语科技写作》（Ann/任胜利等系统整理的英文科技论文写作原则）：主题句、一段一意、
 *     已知→新信息流（given→new）、平行结构、简洁句、适度 hedging。
 *   - pengsida/learning_research 推荐的「论文写作模板」：Introduction 四段式故事线、一句话贡献、
 *     Related Work 按主题分组、Method 先 motivation/overview 再细节、Experiments 每图表回答一个问题。
 *
 * 纯数据、无副作用，前后端均可 import。
 */

export interface StoryStep {
  /** 段落定位，如「第 1 段 · 重要性」 */
  stage: string;
  /** 这一段要达成的意图（一句话） */
  intent: string;
  /** 该写什么（要点） */
  contains: string[];
  /** 常见坑 / 反面教材 */
  pitfall: string;
}

/**
 * Introduction 四段式故事线（learning_research 论文写作模板的核心）。
 * 一篇论文的 Introduction 本质是「讲一个让审稿人信服的故事」。
 */
export const INTRO_STORYLINE: StoryStep[] = [
  {
    stage: "第 1 段 · 重要性（big picture）",
    intent: "让读者相信这个问题值得研究——把研究放进一个更大的、人人认同的背景里。",
    contains: [
      "领域的大背景与该问题的现实/科学价值",
      "用一两句把范围迅速收窄到本文要解决的具体问题",
    ],
    pitfall: "从「自古以来」式空泛背景写起，迟迟不点题；或堆砌与本文无关的宏大叙事。",
  },
  {
    stage: "第 2 段 · 现有方法及其局限（gap）",
    intent: "梳理已有路线，点出它们共同的、尚未解决的关键缺口——这正是你的切入点。",
    contains: [
      "把已有工作按思路归类（而非逐篇罗列）",
      "指出它们共有的局限 / 未解决的痛点（你的 motivation 来源）",
    ],
    pitfall: "把相关工作写成流水账；只夸别人不点局限，导致读者看不出你为什么要做。",
  },
  {
    stage: "第 3 段 · 我们的洞察与方法（insight + approach）",
    intent: "给出你的关键 insight，并据此提出方法——强调「为什么这样做能补上那个缺口」。",
    contains: [
      "一句话点明核心洞察（key insight）",
      "高层次描述方法如何利用该洞察解决第 2 段的局限",
      "可附一张 teaser/overview 图的指引（不画图，只说图要传达什么）",
    ],
    pitfall: "直接陷入技术细节而不先讲清「为什么这么设计」；insight 与方法脱节。",
  },
  {
    stage: "第 4 段 · 贡献与结果概述（contributions）",
    intent: "用 bullet 列出可被验证的贡献，并用一两句结果数字让读者预期收益。",
    contains: [
      "2–4 条贡献，每条「做了什么 + 带来什么收益」并行书写",
      "一句话结果概述（在哪些 benchmark 上、相对谁、提升多少）",
    ],
    pitfall: "贡献写成方法步骤清单；夸大「首次/最优」而无证据；与实验结论对不上。",
  },
];

export interface Principle {
  name: string;
  /** 一句话原则 */
  rule: string;
  /** 反例 → 正例（让原则可操作） */
  example: string;
}

/**
 * 《英语科技写作》核心可操作原则。每条都给「反例→正例」，便于落到段落脚手架里。
 */
export const WRITING_PRINCIPLES: Principle[] = [
  {
    name: "主题句先行（topic sentence first）",
    rule: "每段第一句就是该段结论 / 主张，其余句子为它服务。读者只读首句也能串起全文逻辑。",
    example: "× 先铺三句背景再点题。 √ “We address the data-scarcity problem in medical segmentation.” 放段首。",
  },
  {
    name: "一段一意（one idea per paragraph）",
    rule: "一段只讲一件事；新论点另起一段。段落长度服务于一个完整论证，而非凑字数。",
    example: "× 在「方法」段里又塞实验结果。 √ 方法与结果各自成段。",
  },
  {
    name: "已知→新（given–new flow）",
    rule: "每句以读者已知信息开头、以新信息结尾；下一句承接上一句句尾的新信息，形成链条。",
    example: "× 句子各说各话。 √ “…produces a feature map. This feature map is then fed into…”",
  },
  {
    name: "平行结构（parallelism）",
    rule: "并列的贡献 / 列表 / 对比，使用一致的语法结构与时态，读起来工整、可预期。",
    example: "× “We propose X, and Y is improved.” √ “We propose X and improve Y.”",
  },
  {
    name: "简洁句（concision）",
    rule: "删冗余、用强动词、少名词化、少废话短语；一句话只表达一个清楚的关系。",
    example: "× “due to the fact that” “in order to”。 √ “because” “to”。",
  },
  {
    name: "适度限定（hedging & precision）",
    rule: "结论按证据强度措辞：能证明的用肯定语气，未充分验证的用 may/suggest，杜绝编造与夸大。",
    example: "× “Our method solves the problem.” √ “Our method substantially reduces … under low-data regimes.”",
  },
];

export interface SignpostGroup {
  /** 关系类别 */
  relation: string;
  /** 英文连接词 */
  en: string[];
  /** 中文对应 */
  zh: string;
}

/**
 * 过渡 / 连接词（signposting）—— 帮读者预判逻辑走向，是 given→new 之外的第二层粘合剂。
 */
export const SIGNPOSTS: SignpostGroup[] = [
  { relation: "递进 / 补充", en: ["Moreover", "Furthermore", "In addition", "Beyond this"], zh: "而且 / 此外 / 进一步" },
  { relation: "对比 / 转折", en: ["However", "In contrast", "Nevertheless", "Yet"], zh: "然而 / 相比之下 / 尽管如此" },
  { relation: "因果 / 推论", en: ["Therefore", "Consequently", "As a result", "Hence"], zh: "因此 / 从而 / 由此" },
  { relation: "举例 / 具体化", en: ["For instance", "Specifically", "In particular", "Notably"], zh: "例如 / 具体而言 / 尤其" },
  { relation: "总结 / 收束", en: ["Overall", "In summary", "Taken together", "To this end"], zh: "总体而言 / 综上 / 为此" },
];

export interface SectionMove {
  /** 章节名 */
  section: string;
  /** 该章节的写作动作（怎么写） */
  moves: string[];
  /** 审稿人常盯的点（自查锚点） */
  reviewerFocus: string;
}

/**
 * 各章节的「写作动作」+「审稿关注点」。是逐节脚手架与自查清单的依据。
 */
export const SECTION_MOVES: SectionMove[] = [
  {
    section: "Abstract（摘要）",
    moves: [
      "5 句法：背景痛点 → 局限 → 我们做了什么 → 怎么做的（一句） → 结果数字",
      "首句即点明问题，末句给最强的量化结论；不引用、不出现未定义缩写",
    ],
    reviewerFocus: "30 秒内能否判断「解决什么问题、凭什么、效果如何」。",
  },
  {
    section: "Introduction（引言）",
    moves: [
      "严格走四段式故事线：重要性 → 现有局限 → 洞察+方法 → 贡献+结果",
      "贡献用 bullet 平行书写，与实验一一对应",
    ],
    reviewerFocus: "motivation 是否自然导出方法；贡献是否可验证、不夸大。",
  },
  {
    section: "Related Work（相关工作）",
    moves: [
      "按主题/技术路线分组，每组先综述共性，再点出与本工作的关系（继承 / 对比 / 补足）",
      "落脚点永远是「因此本文……」，避免写成参考文献朗读",
    ],
    reviewerFocus: "是否漏掉关键近作；是否清楚区分本文与最接近的工作。",
  },
  {
    section: "Method（方法）",
    moves: [
      "先给 overview（一段 + 一张总览图的指引）讲清动机与整体数据流，再分模块展开",
      "每个设计先说「为什么需要」再说「怎么做」；符号统一、可复现",
    ],
    reviewerFocus: "是否讲清每个组件的必要性（而非堆模块）；是否可复现。",
  },
  {
    section: "Experiments（实验）",
    moves: [
      "开篇交代数据集 / 指标 / baseline / 实现细节；每个表或图回答一个明确问题",
      "主结果 → 消融 → 分析/可视化；每段先抛结论句再给证据",
    ],
    reviewerFocus: "对比是否公平；消融是否支撑每条贡献；结论是否被数据支持。",
  },
  {
    section: "Conclusion（结论）",
    moves: [
      "复述问题与核心贡献（不复制摘要原句），点出局限与未来方向",
      "不引入新结果，给读者一个干净的收束",
    ],
    reviewerFocus: "是否诚实交代局限；是否与正文结论一致。",
  },
];

/** 参考来源标注（用于面板出处展示与 prompt 署名）。 */
export const SOURCES = [
  {
    label: "《英语科技写作》",
    note: "主题句 / 一段一意 / 已知→新信息流 / 平行结构 / 简洁句 / 适度限定等英文科技写作原则。",
  },
  {
    label: "pengsida/learning_research · 论文写作模板",
    note: "Introduction 四段式故事线、一句话贡献、Related Work 分组、Method 先动机后细节。",
    url: "https://github.com/pengsida/learning_research",
  },
] as const;
